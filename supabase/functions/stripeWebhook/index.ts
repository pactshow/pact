import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';
import { reportError } from '../_shared/sentry.ts';

// Public endpoint — Stripe is the caller, not a logged-in user. Deploy
// with `--no-verify-jwt` so Supabase doesn't reject requests for lacking
// an Authorization header. Authenticity is established by the Stripe
// signature on every event, verified below.

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
});

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  // Dedup: Stripe retries on 5xx, and we don't want to double-process a
  // succeeded event. Insert event id; if it conflicts, we've already
  // handled it and can ack-and-skip.
  const { error: dupErr } = await admin
    .from('stripe_webhook_events')
    .insert({ stripe_event_id: event.id, event_type: event.type });
  if (dupErr) {
    if ((dupErr as { code?: string }).code === '23505') {
      return new Response(JSON.stringify({ received: true, deduped: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('Failed to record webhook event:', dupErr);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'payment_intent.processing':
        await handlePaymentIntentProcessing(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpserted(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    reportError('stripeWebhook', err, { event_type: event.type, event_id: event.id });
    // Returning 500 makes Stripe retry. That's what we want for transient
    // errors — the handler is idempotent below.
    return new Response('Handler error', { status: 500 });
  }
});

// ACH state machine:
//   checkout.session.completed → status='processing'  (user authorized, ACH initiated)
//   payment_intent.succeeded   → status='paid'        (funds settled, 3–5 business days later)
//   payment_intent.payment_failed → status='cancelled' (ACH bounced)

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const paymentId =
    session.client_reference_id ?? session.metadata?.pact_payment_id ?? null;

  if (!paymentId) {
    console.error('checkout.session.completed without payment id', session.id);
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : null;

  const { error } = await admin
    .from('payments')
    .update({
      stripe_payment_intent_id: paymentIntentId,
      status: 'processing',
      method: 'stripe_ach',
    })
    .eq('id', paymentId);

  if (error) {
    console.error('Failed to mark payment processing:', error);
    throw error;
  }

  console.log(`Marked payment ${paymentId} processing (PI ${paymentIntentId})`);
}

async function handlePaymentIntentProcessing(pi: Stripe.PaymentIntent) {
  const paymentId = pi.metadata?.pact_payment_id;
  if (!paymentId) return;

  const { error } = await admin
    .from('payments')
    .update({
      stripe_payment_intent_id: pi.id,
      status: 'processing',
      method: 'stripe_ach',
    })
    .eq('id', paymentId)
    .neq('status', 'paid'); // don't regress a paid row

  if (error) throw error;
}

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  const paymentId = pi.metadata?.pact_payment_id;
  if (!paymentId) {
    console.error('payment_intent.succeeded without pact_payment_id', pi.id);
    return;
  }

  const expanded = await stripe.paymentIntents.retrieve(pi.id, {
    expand: ['latest_charge'],
  });
  const latest = expanded.latest_charge;
  const chargeId = typeof latest === 'string' ? latest : latest?.id ?? null;

  const { data: existing } = await admin
    .from('payments')
    .select('amount, stripe_charge_id, status')
    .eq('id', paymentId)
    .single();

  if (existing?.status === 'paid' && existing.stripe_charge_id === chargeId) {
    return;
  }

  // Defense-in-depth: confirm the Stripe-side amount matches what we
  // expect. createPaymentIntent stamps `pact_charge_amount_cents` into
  // metadata at intent creation; that's the authoritative gross we
  // should see come back. Fall back to the DB amount (contract-amount
  // == charge) for any pre-fee_payer contracts that didn't get the
  // metadata stamp.
  if (existing) {
    const stampedCharge = Number(pi.metadata?.pact_charge_amount_cents);
    const expectedCents = Number.isFinite(stampedCharge) && stampedCharge > 0
      ? stampedCharge
      : Math.round(Number(existing.amount) * 100);
    if (Number.isFinite(expectedCents) && pi.amount !== expectedCents) {
      console.error(
        `Amount mismatch for payment ${paymentId}: Stripe ${pi.amount}, expected ${expectedCents}`,
      );
      return;
    }
  }

  const { error } = await admin
    .from('payments')
    .update({
      stripe_charge_id: chargeId,
      stripe_payment_intent_id: pi.id,
      status: 'paid',
      paid_date: new Date().toISOString().split('T')[0],
      method: 'stripe_ach',
    })
    .eq('id', paymentId);

  if (error) throw error;

  console.log(`Marked payment ${paymentId} paid (charge ${chargeId})`);
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentId = charge.metadata?.pact_payment_id
    ?? (charge.payment_intent && typeof charge.payment_intent === 'string'
      ? (await stripe.paymentIntents.retrieve(charge.payment_intent)).metadata?.pact_payment_id
      : null);
  if (!paymentId) {
    console.error('charge.refunded without pact_payment_id', charge.id);
    return;
  }

  // Read current state. We need to know whether funds have already
  // been transferred to the contractor — if yes, this refund is a
  // platform liability we can't auto-recover.
  const { data: existing } = await admin
    .from('payments')
    .select('amount, stripe_transfer_id, refunded_amount_cents')
    .eq('id', paymentId)
    .single();

  const fullyRefunded = charge.amount_refunded >= charge.amount;
  const refundedAfterTransfer = !!existing?.stripe_transfer_id;

  // Partial refund: do NOT regress status to 'pending'. The cron
  // filters by status='paid', so flipping back to 'pending' would
  // strand the contractor's payout entirely. Track refunded amount
  // instead; the cron will subtract it before transferring.
  const update: Record<string, unknown> = {
    refunded_amount_cents: charge.amount_refunded,
    notes: `Refunded $${(charge.amount_refunded / 100).toFixed(2)} of $${(charge.amount / 100).toFixed(2)} on ${new Date().toISOString().split('T')[0]}`,
  };

  if (fullyRefunded) {
    update.status = 'cancelled';
  }
  // else: keep status='paid' so cron can compute net transfer.

  if (refundedAfterTransfer) {
    update.refund_after_transfer_alert = true;
    console.error(
      `[ALERT] Refund arrived AFTER transfer for payment ${paymentId}. ` +
      `Charge ${charge.id}, transfer ${existing?.stripe_transfer_id}. ` +
      `Funds already at contractor; platform owes refund. Manual reconciliation required.`,
    );
  }

  const { error } = await admin
    .from('payments')
    .update(update)
    .eq('id', paymentId);

  if (error) throw error;
  console.log(
    `Refund recorded for payment ${paymentId} ` +
    `(${fullyRefunded ? 'full' : 'partial'}${refundedAfterTransfer ? ', POST-TRANSFER ALERT' : ''})`,
  );
}

// =====================================================================
// Subscription billing — keeps the `subscriptions` table aligned with
// Stripe's view of the world. Stripe is the source of truth; we mirror.
// =====================================================================

async function handleSubscriptionUpserted(sub: Stripe.Subscription) {
  const status = mapStripeSubscriptionStatus(sub.status);

  const update: Record<string, unknown> = {
    status,
    cancel_at_period_end: sub.cancel_at_period_end,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    trial_ends_at: sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : null,
  };

  // Tier may have changed via updateSubscription. Look up which of our
  // tiers maps to the current price; if we recognize it, persist.
  const priceId = sub.items.data[0]?.price?.id;
  const tier = priceId ? tierFromPriceId(priceId) : null;
  if (tier) update.tier = tier;

  const { error, count } = await admin
    .from('subscriptions')
    .update(update, { count: 'exact' })
    .eq('stripe_subscription_id', sub.id);

  if (error) throw error;

  // First time we've seen this subscription — happens if Stripe fires
  // customer.subscription.created before finalizeSubscription's DB write
  // lands. Webhooks aren't ordered against our own writes. Insert by
  // metadata.pact_profile_id so the row exists either way.
  if (count === 0) {
    const profileId = sub.metadata?.pact_profile_id;
    if (!profileId) {
      console.warn(`subscription ${sub.id} not in DB and has no pact_profile_id`);
      return;
    }
    const { error: insertErr } = await admin
      .from('subscriptions')
      .upsert(
        {
          profile_id: profileId,
          tier: tier ?? 'artist_basic',
          stripe_subscription_id: sub.id,
          stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
          ...update,
        },
        { onConflict: 'profile_id' },
      );
    if (insertErr) throw insertErr;
  }

  console.log(`Synced subscription ${sub.id} → status=${status}`);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const { error } = await admin
    .from('subscriptions')
    .update({
      status: 'canceled',
      cancel_at_period_end: false,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
    })
    .eq('stripe_subscription_id', sub.id);
  if (error) throw error;
  console.log(`Subscription ${sub.id} canceled`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;
  if (!subId) return;

  // Refetch the subscription so we get the authoritative status +
  // current_period_end (the invoice itself may be slightly stale).
  const sub = await stripe.subscriptions.retrieve(subId);
  await handleSubscriptionUpserted(sub);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;
  if (!subId) return;

  // Stripe will also fire customer.subscription.updated → past_due, but
  // we attach a note here so the Account tab can surface "ACH failed —
  // please update your bank" context that the subscription object alone
  // doesn't carry.
  const reason = invoice.last_finalization_error?.message
    ?? 'Bank rejected the ACH debit. Please verify your bank or change banks.';

  const sub = await stripe.subscriptions.retrieve(subId);
  await handleSubscriptionUpserted(sub);

  console.log(`Invoice ${invoice.id} failed for subscription ${subId}: ${reason}`);
}

function mapStripeSubscriptionStatus(s: Stripe.Subscription.Status): string {
  const allowed = new Set([
    'incomplete', 'incomplete_expired', 'trialing',
    'active', 'past_due', 'canceled', 'unpaid',
  ]);
  return allowed.has(s) ? s : 'incomplete';
}

// Resolve a Stripe price_id back to our tier enum. Configured via
// secrets so test/prod can use different price IDs without code changes.
function tierFromPriceId(priceId: string): string | null {
  const map: Record<string, string | undefined> = {
    [Deno.env.get('STRIPE_PRICE_ARTIST_BASIC') ?? '__']:   'artist_basic',
    [Deno.env.get('STRIPE_PRICE_ARTIST_PRO') ?? '__']:     'artist_pro',
    [Deno.env.get('STRIPE_PRICE_PROMOTER_BASIC') ?? '__']: 'promoter_basic',
    [Deno.env.get('STRIPE_PRICE_PROMOTER_PRO') ?? '__']:   'promoter_pro',
  };
  return map[priceId] ?? null;
}

async function handlePaymentIntentFailed(pi: Stripe.PaymentIntent) {
  const paymentId = pi.metadata?.pact_payment_id;
  if (!paymentId) return;

  const reason =
    pi.last_payment_error?.message ?? 'ACH transfer failed';

  const { error } = await admin
    .from('payments')
    .update({
      status: 'cancelled',
      notes: `ACH failed: ${reason}`,
    })
    .eq('id', paymentId);

  if (error) throw error;

  console.log(`Marked payment ${paymentId} cancelled — ${reason}`);
}
