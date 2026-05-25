import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';

// Caller-initiated transfer of a single payment, ahead of the daily cron.
// Only the client (payer) can release — releasing waives their dispute
// rights on that payment, so it must be an explicit, authenticated action.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
});

// DISABLED 2026-05-06 — Phase 4d (ACH-only) made early-release moot;
// ACH's natural 3-5 day settlement covers the hold. The button was
// removed from the UI but this function is still deployed. Hard-fail
// here so an accidental DevTools invocation can't bypass the dispute
// window. To re-enable, set RELEASE_PAYMENT_EARLY_ENABLED=true.
const RELEASE_DISABLED = Deno.env.get('RELEASE_PAYMENT_EARLY_ENABLED') !== 'true';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (RELEASE_DISABLED) {
    return json(
      { error: 'releasePaymentEarly is disabled. Funds release on dispute-window close via the daily cron.' },
      410,
    );
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { payment_id } = await req.json();
    if (!payment_id) return json({ error: 'payment_id is required' }, 400);

    // RLS scopes this read to contracts the caller is a party to.
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, contracts(*)')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      return json({ error: 'Payment not found' }, 404);
    }

    const contract = payment.contracts;
    if (!contract) return json({ error: 'Contract not found' }, 404);

    // Only the client side may release.
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!callerProfile || callerProfile.id !== contract.client_profile_id) {
      return json({ error: 'Only the client can release funds' }, 403);
    }

    // Guards.
    if (!payment.stripe_charge_id) {
      return json({ error: 'Payment has not been captured yet' }, 409);
    }
    if (payment.stripe_transfer_id) {
      return json({ error: 'Payment has already been transferred' }, 409);
    }
    if (contract.contractor_disputed || contract.client_disputed) {
      return json({ error: 'Cannot release funds while a dispute is open' }, 409);
    }
    if (!contract.contractor_signature || !contract.client_signature) {
      return json({ error: 'Contract is not fully signed' }, 400);
    }

    // Need service-role to read the contractor's connect account regardless
    // of caller's RLS reach (caller is the client, not the contractor).
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: contractorProfile, error: profileError } = await admin
      .from('profiles')
      .select('stripe_connect_account_id, stripe_onboarding_complete')
      .eq('id', contract.contractor_profile_id)
      .single();

    if (profileError || !contractorProfile) {
      return json({ error: 'Contractor profile not found' }, 404);
    }
    if (
      !contractorProfile.stripe_connect_account_id ||
      !contractorProfile.stripe_onboarding_complete
    ) {
      return json(
        { error: "Contractor hasn't completed bank onboarding yet — they need to connect their account before funds can be released." },
        409,
      );
    }

    const amountCents = Math.round(Number(payment.amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return json({ error: 'Invalid payment amount' }, 400);
    }

    const transfer = await stripe.transfers.create(
      {
        amount: amountCents,
        currency: 'usd',
        destination: contractorProfile.stripe_connect_account_id,
        source_transaction: payment.stripe_charge_id,
        description: `Pact (early release): ${contract.title} — ${payment.type}`,
        metadata: {
          pact_payment_id: payment.id,
          pact_contract_id: contract.id,
          pact_release_type: 'early',
          pact_released_by_user_id: user.id,
        },
      },
      {
        // Same key shape as the cron path — prevents double-transfer if
        // the cron picks this up before our update commits, or if the
        // client double-clicks before the request returns.
        idempotencyKey: `pact_transfer_${payment.id}`,
      },
    );

    const { error: updateError } = await admin
      .from('payments')
      .update({
        stripe_transfer_id: transfer.id,
        transfer_initiated_at: new Date().toISOString(),
        method: 'stripe_transfer',
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Transfer succeeded but DB update failed:', updateError);
      // Don't surface a 500 — Stripe already moved the money, and the
      // idempotency key means re-trying would safely no-op the transfer.
      // The cron will reconcile the row on its next run.
      return json({
        warning: 'Transfer initiated but local record could not be updated',
        transfer_id: transfer.id,
      }, 200);
    }

    return json({
      success: true,
      transfer_id: transfer.id,
      payment_id: payment.id,
    });
  } catch (err) {
    console.error('releasePaymentEarly error:', err);
    return json(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
