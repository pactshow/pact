import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';

import { reportError } from '../_shared/sentry.ts';
// Daily cron-invoked job. For each contract whose dispute window has
// closed without a dispute, transfer captured platform funds to the
// contractor's connected Stripe account.
//
// Auth: caller must present the Supabase service role key as a Bearer
// token (default JWT verification accepts it). Set up the schedule with
// pg_cron + pg_net — see migrations/0005_schedule_transfers.sql.

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
});

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Pact's per-transaction platform fee. Charged to the contractor at
// payout time — they receive (charge_amount - fee). With the
// separate-charges-and-transfers pattern, application_fee_amount
// isn't applicable; the fee is implicit in the smaller transfer
// amount, with the remainder staying on platform balance.
//
// Configurable via env so the rate can change without a code deploy.
// Default 200 bps = 2.00%.
const PACT_FEE_BPS = parseInt(Deno.env.get('PACT_FEE_BPS') ?? '200', 10);

type Contract = {
  id: string;
  title: string;
  created_by: string | null;
  contractor_profile_id: string;
  client_profile_id: string;
  contractor_signature: string | null;
  client_signature: string | null;
  contractor_disputed: boolean;
  client_disputed: boolean;
  dispute_window_closes: string | null;
  ach_transfer_triggered: boolean;
  fee_payer: 'contractor' | 'client' | 'split' | null;
};

// Contractor's share of Pact's fee, given the contract's fee_payer.
// Mirrors createPaymentIntent's split-rounding rule: contractor's
// deduction floors so the contractor is never shorted a sub-cent.
function contractorFeeShare(feeCents: number, feePayer: string): number {
  if (feePayer === 'client') return 0;
  if (feePayer === 'split') return Math.floor(feeCents / 2);
  return feeCents; // 'contractor' (default)
}

type Payment = {
  id: string;
  contract_id: string;
  type: string;
  amount: number;
  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
  refunded_amount_cents: number | null;
};

Deno.serve(async (_req) => {
  const now = new Date();
  const transferred: Array<{ payment_id: string; transfer_id: string }> = [];
  const skipped: Array<{ contract_id?: string; payment_id?: string; reason: string }> = [];
  const errors: Array<{ contract_id?: string; payment_id?: string; error: string }> = [];

  try {
    // Contracts ready for transfer:
    //   - dispute window has closed
    //   - both parties signed
    //   - neither party filed a dispute
    //   - haven't already triggered transfers
    const { data: contracts, error: contractsError } = await admin
      .from('contracts')
      .select(
        'id, title, created_by, contractor_profile_id, client_profile_id, contractor_signature, client_signature, contractor_disputed, client_disputed, dispute_window_closes, ach_transfer_triggered, fee_payer',
      )
      .eq('ach_transfer_triggered', false)
      .eq('contractor_disputed', false)
      .eq('client_disputed', false)
      .not('dispute_window_closes', 'is', null)
      .lte('dispute_window_closes', now.toISOString());

    if (contractsError) throw contractsError;

    for (const contract of (contracts ?? []) as Contract[]) {
      if (!contract.contractor_signature || !contract.client_signature) {
        skipped.push({ contract_id: contract.id, reason: 'not fully signed' });
        continue;
      }

      // Resolve the effective fee rate for this contract — the creator's
      // subscription may have a custom_fee_bps override (enterprise deal).
      let effectiveFeeBps = PACT_FEE_BPS;
      if (contract.created_by) {
        const { data: creatorProfile } = await admin
          .from('profiles')
          .select('id')
          .eq('user_id', contract.created_by)
          .maybeSingle();
        if (creatorProfile) {
          const { data: creatorSub } = await admin
            .from('subscriptions')
            .select('custom_fee_bps')
            .eq('profile_id', creatorProfile.id)
            .maybeSingle();
          if (creatorSub?.custom_fee_bps != null) {
            effectiveFeeBps = creatorSub.custom_fee_bps;
          }
        }
      }

      // Look up the contractor's connected account.
      const { data: contractorProfile, error: profileError } = await admin
        .from('profiles')
        .select('id, stripe_connect_account_id, stripe_onboarding_complete')
        .eq('id', contract.contractor_profile_id)
        .single();

      if (profileError || !contractorProfile) {
        errors.push({ contract_id: contract.id, error: 'contractor profile not found' });
        continue;
      }

      if (
        !contractorProfile.stripe_connect_account_id ||
        !contractorProfile.stripe_onboarding_complete
      ) {
        // Don't mark the contract triggered — try again next run, after
        // contractor finishes onboarding.
        skipped.push({
          contract_id: contract.id,
          reason: 'contractor has not completed Stripe Connect onboarding',
        });
        continue;
      }

      // Live-check the Connect account: it can become restricted
      // (chargeback history, document expiry) AFTER onboarding is
      // marked complete. Sending a transfer to a restricted account
      // throws, the payment gets stuck, and the contractor never sees
      // funds. Skip and retry next run gives Stripe time to clear the
      // hold OR for the contractor to update docs.
      try {
        const connectAcct = await stripe.accounts.retrieve(
          contractorProfile.stripe_connect_account_id,
        );
        if (!connectAcct.payouts_enabled) {
          skipped.push({
            contract_id: contract.id,
            reason: `connect account payouts_enabled=false (requirements: ${
              JSON.stringify(connectAcct.requirements?.currently_due ?? [])
            })`,
          });
          continue;
        }
      } catch (err) {
        errors.push({
          contract_id: contract.id,
          error: `connect account lookup failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        });
        continue;
      }

      // Pull all payments on this contract that are charged but not yet transferred.
      // Pull payments that are settled (status='paid') but not yet transferred.
      // ACH payments sit in 'processing' for 3–5 business days before clearing;
      // those are skipped this run and picked up after they settle.
      const { data: payments, error: paymentsError } = await admin
        .from('payments')
        .select('id, contract_id, type, amount, stripe_charge_id, stripe_transfer_id, refunded_amount_cents')
        .eq('contract_id', contract.id)
        .eq('status', 'paid')
        .not('stripe_charge_id', 'is', null)
        .is('stripe_transfer_id', null);

      if (paymentsError) {
        errors.push({ contract_id: contract.id, error: paymentsError.message });
        continue;
      }

      let allPaymentsHandled = true;

      for (const payment of (payments ?? []) as Payment[]) {
        try {
          const amountCents = Math.round(Number(payment.amount) * 100);
          if (!Number.isFinite(amountCents) || amountCents <= 0) {
            errors.push({ payment_id: payment.id, error: 'invalid amount' });
            allPaymentsHandled = false;
            continue;
          }

          // Subtract any partial refunds before computing fee + transfer.
          // The webhook records refunds onto refunded_amount_cents and
          // keeps status='paid' so we still pick up the row here; the
          // contractor receives net-of-refund.
          const refundedCents = Math.max(
            0,
            Number(payment.refunded_amount_cents ?? 0),
          );
          const netCents = amountCents - refundedCents;
          if (netCents <= 0) {
            // Fully refunded but webhook hadn't yet flipped status to
            // 'cancelled'. Skip — the next refund or status event will
            // clean up.
            skipped.push({
              payment_id: payment.id,
              reason: `fully refunded (${refundedCents}/${amountCents} cents)`,
            });
            continue;
          }

          // Floor the fee so rounding never causes the contractor to be
          // shorted by even a cent — Pact eats the sub-cent difference.
          const feeCents = Math.floor((netCents * effectiveFeeBps) / 10_000);
          const feePayer = contract.fee_payer ?? 'contractor';
          const contractorFeeCents = contractorFeeShare(feeCents, feePayer);
          const transferAmountCents = netCents - contractorFeeCents;

          const transfer = await stripe.transfers.create(
            {
              amount: transferAmountCents,
              currency: 'usd',
              destination: contractorProfile.stripe_connect_account_id!,
              source_transaction: payment.stripe_charge_id!,
              description: `Pact: ${contract.title} — ${payment.type}`,
              metadata: {
                pact_payment_id: payment.id,
                pact_contract_id: contract.id,
                pact_charge_amount_cents: String(amountCents),
                pact_refunded_cents: String(refundedCents),
                pact_net_cents: String(netCents),
                pact_fee_cents: String(feeCents),
                pact_contractor_fee_cents: String(contractorFeeCents),
                pact_fee_payer: feePayer,
                pact_fee_bps: String(effectiveFeeBps),
              },
            },
            {
              // Idempotency key prevents double-transfer if the function is
              // retried mid-flight (pg_cron, network blip, etc.).
              idempotencyKey: `pact_transfer_${payment.id}`,
            },
          );

          const { error: updateError } = await admin
            .from('payments')
            .update({
              stripe_transfer_id: transfer.id,
              transfer_initiated_at: new Date().toISOString(),
            })
            .eq('id', payment.id);

          if (updateError) throw updateError;

          transferred.push({ payment_id: payment.id, transfer_id: transfer.id });
        } catch (err) {
          allPaymentsHandled = false;
          const msg = err instanceof Error ? err.message : String(err);
          errors.push({ payment_id: payment.id, contract_id: contract.id, error: msg });
          console.error(`Transfer failed for payment ${payment.id}:`, msg);
        }
      }

      // Only flip ach_transfer_triggered when *every* payment on the contract
      // has been transferred. If any are still 'processing' (ACH not yet cleared)
      // or 'pending' (never paid), leave the flag false so a future run picks
      // them up after they settle.
      if (allPaymentsHandled) {
        const { data: outstanding } = await admin
          .from('payments')
          .select('id')
          .eq('contract_id', contract.id)
          .is('stripe_transfer_id', null);

        if (!outstanding || outstanding.length === 0) {
          await admin
            .from('contracts')
            .update({
              ach_transfer_triggered: true,
              ach_transfer_date: new Date().toISOString(),
            })
            .eq('id', contract.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        transferred: transferred.length,
        skipped: skipped.length,
        errors: errors.length,
        details: { transferred, skipped, errors },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    reportError('processDisputeWindowPayments', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
