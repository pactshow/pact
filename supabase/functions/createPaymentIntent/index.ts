import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://www.pact.show',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
});

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  deposit: 'Deposit',
  balance: 'Balance',
  full_payment: 'Full Payment',
  bonus: 'Bonus',
  other: 'Payment',
};

// Pact fee math — must stay in sync with src/lib/feeMath.js and the
// processDisputeWindowPayments cron. Deno can't import the .js file.
const PACT_FEE_BPS = Number(Deno.env.get('PACT_FEE_BPS') ?? '200');

function computeChargeWithFee(
  amountCents: number,
  feePayer: string,
  feeBps: number = PACT_FEE_BPS,
): {
  chargeCents: number;
  clientFeeCents: number;
  contractorFeeCents: number;
  feeCents: number;
} {
  const feeCents = Math.floor((amountCents * feeBps) / 10_000);
  const half = feeCents / 2;
  const contractorFeeCents =
    feePayer === 'contractor' ? feeCents : feePayer === 'split' ? Math.floor(half) : 0;
  const clientFeeCents =
    feePayer === 'client' ? feeCents : feePayer === 'split' ? Math.ceil(half) : 0;
  return {
    chargeCents: amountCents + clientFeeCents,
    clientFeeCents,
    contractorFeeCents,
    feeCents,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, contracts(*)')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) return json({ error: 'Payment not found' }, 404);

    const contract = payment.contracts;
    if (!contract) return json({ error: 'Contract not found' }, 404);

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!callerProfile || callerProfile.id !== contract.client_profile_id) {
      return json({ error: 'Only the client can pay this contract' }, 403);
    }

    if (payment.status === 'paid' || payment.stripe_charge_id) {
      return json({ error: 'Payment already captured' }, 409);
    }
    if (payment.status === 'processing') {
      return json({ error: 'Payment already in progress — waiting for ACH to clear' }, 409);
    }

    // Sequential gating: backend mirror of the frontend lock. A client
    // cannot pay a later installment (balance) before earlier ones are
    // marked 'paid'. Without this, DevTools could call this function with
    // any payment_id and skip the ordering.
    const TYPE_ORDER: Record<string, number> = {
      full_payment: 0, deposit: 1, balance: 2, bonus: 3, other: 4,
    };
    const { data: siblings } = await supabase
      .from('payments')
      .select('id, type, status, due_date, created_at')
      .eq('contract_id', contract.id);

    if (siblings && siblings.length > 1) {
      const ordered = [...siblings].sort((a, b) => {
        const ta = TYPE_ORDER[a.type] ?? 99;
        const tb = TYPE_ORDER[b.type] ?? 99;
        if (ta !== tb) return ta - tb;
        const ad = a.due_date ?? a.created_at ?? '';
        const bd = b.due_date ?? b.created_at ?? '';
        return ad.localeCompare(bd);
      });
      const myIdx = ordered.findIndex(p => p.id === payment.id);
      const earlierUnpaid = ordered.slice(0, myIdx).find(p => p.status !== 'paid');
      if (earlierUnpaid) {
        return json({ error: 'Pay earlier installments first' }, 409);
      }
    }
    if (!contract.contractor_signature || !contract.client_signature) {
      return json({ error: 'Contract is not fully signed' }, 400);
    }

    const amountCents = Math.round(Number(payment.amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return json({ error: 'Invalid payment amount' }, 400);
    }

    const feePayer = (contract.fee_payer ?? 'contractor') as string;

    // Per-subscription fee override: when the contract creator's
    // subscription has a custom_fee_bps set (enterprise deal), use that
    // instead of the platform default. Need service role to read another
    // user's subscription, so build the admin client here.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
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

    const { chargeCents, clientFeeCents, contractorFeeCents, feeCents } =
      computeChargeWithFee(amountCents, feePayer, effectiveFeeBps);

    const typeLabel = PAYMENT_TYPE_LABEL[payment.type] ?? 'Payment';
    const description = `${contract.title} — ${typeLabel}`;

    // Reuse the existing PaymentIntent if we already started one for this row.
    let paymentIntent: Stripe.PaymentIntent | null = null;
    if (payment.stripe_payment_intent_id) {
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
        // If it's already succeeded or in a terminal state, don't reuse.
        if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'canceled') {
          paymentIntent = null;
        }
      } catch {
        paymentIntent = null;
      }
    }

    if (!paymentIntent) {
      // Idempotency key derived from payment_id: a concurrent double-
      // click that races into this branch deterministically gets back
      // the same PaymentIntent from Stripe instead of creating a new
      // one. Combined with the unique index on stripe_payment_intent_id
      // (migration 0016) this closes the duplicate-PI race window.
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: chargeCents,
          currency: 'usd',
          payment_method_types: ['us_bank_account'],
          payment_method_options: {
            us_bank_account: {
              financial_connections: { permissions: ['payment_method'] },
              verification_method: 'instant',
            },
          },
          description,
          receipt_email: user.email ?? undefined,
          metadata: {
            pact_payment_id: payment.id,
            pact_contract_id: contract.id,
            pact_payment_type: payment.type,
            pact_contract_amount_cents: String(amountCents),
            pact_charge_amount_cents: String(chargeCents),
            pact_fee_payer: feePayer,
            pact_client_fee_cents: String(clientFeeCents),
            pact_contractor_fee_cents: String(contractorFeeCents),
            pact_fee_cents: String(feeCents),
            pact_fee_bps: String(effectiveFeeBps),
          },
        },
        {
          idempotencyKey: `pact_pi_${payment.id}`,
        },
      );

      await admin
        .from('payments')
        .update({ stripe_payment_intent_id: paymentIntent.id })
        .eq('id', payment.id);
    }

    return json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      contract_amount_cents: amountCents,
      charge_amount_cents: chargeCents,
      client_fee_cents: clientFeeCents,
      contractor_fee_cents: contractorFeeCents,
      fee_cents: feeCents,
      fee_payer: feePayer,
    });
  } catch (err) {
    console.error('createPaymentIntent error:', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
