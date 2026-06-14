import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';
import { clientIdentifier, rateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { validateBody, z } from '../_shared/validate.ts';

import { reportError } from '../_shared/sentry.ts';
import { corsHeaders as buildCors } from '../_shared/cors.ts';
const BodySchema = z.object({
  side: z.enum(['artist', 'promoter']),
  tier: z.enum(['artist_basic', 'artist_pro', 'promoter_basic', 'promoter_pro']),
  customer_id: z
    .string()
    .regex(/^cus_[A-Za-z0-9]{1,64}$/, 'must be a Stripe Customer id'),
  setup_intent_id: z
    .string()
    .regex(/^seti_[A-Za-z0-9]{1,64}$/, 'must be a Stripe SetupIntent id'),
});

// Onboarding step 3, second half — after the SetupIntent succeeded.
//
// Atomically: writes profile.user_side, upserts the subscriptions row,
// creates the Stripe Subscription with a 30-day trial, and stores the
// resulting Stripe IDs back on the row. After this call, the App.jsx
// gate stops showing Onboarding (user_side is set) and the user lands
// on Dashboard.
//
// Idempotency: if called twice for the same user, we detect the
// already-created Stripe subscription via metadata.pact_user_id and
// return the existing one rather than creating a duplicate.

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
});

const PRICE_FOR_TIER: Record<string, string | undefined> = {
  artist_basic:   Deno.env.get('STRIPE_PRICE_ARTIST_BASIC'),
  artist_pro:     Deno.env.get('STRIPE_PRICE_ARTIST_PRO'),
  promoter_basic: Deno.env.get('STRIPE_PRICE_PROMOTER_BASIC'),
  promoter_pro:   Deno.env.get('STRIPE_PRICE_PROMOTER_PRO'),
};

Deno.serve(async (req) => {
  const corsHeaders = buildCors(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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

    const rl = await rateLimit({
      key: 'finalizeSubscription',
      identifier: clientIdentifier(req, user.id),
      limit: 10,
      windowSec: 60,
    });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter, corsHeaders);

    const parsed = await validateBody(req, BodySchema);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const { side, tier, customer_id, setup_intent_id } = parsed.data;
    if (!tier.startsWith(side)) {
      return json({ error: 'Tier does not match side' }, 400);
    }
    const priceId = PRICE_FOR_TIER[tier];
    if (!priceId) {
      return json({ error: `Stripe price for ${tier} not configured` }, 500);
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (profileErr || !profile) return json({ error: 'Profile not found' }, 404);

    // Re-validate the round-tripped customer_id: only accept it if its
    // metadata.pact_user_id matches the auth'd user. Without this check
    // a client could pass any customer_id and have us mutate it.
    const customer = await stripe.customers.retrieve(customer_id);
    if (customer.deleted || customer.metadata?.pact_user_id !== user.id) {
      return json({ error: 'Customer does not belong to this user' }, 403);
    }

    // SetupIntent must be on the same customer and in succeeded state.
    const si = await stripe.setupIntents.retrieve(setup_intent_id);
    if (si.customer !== customer_id) {
      return json({ error: 'SetupIntent / customer mismatch' }, 400);
    }
    if (si.status !== 'succeeded') {
      return json({ error: `SetupIntent not ready (status: ${si.status})` }, 400);
    }
    const paymentMethodId =
      typeof si.payment_method === 'string' ? si.payment_method : si.payment_method?.id;
    if (!paymentMethodId) {
      return json({ error: 'SetupIntent has no payment method' }, 400);
    }

    // Make this PM the default for invoices on the customer. Stripe
    // will charge it when the trial ends.
    await stripe.customers.update(customer_id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Bank-fingerprint dedup. Each us_bank_account PaymentMethod carries
    // a stable fingerprint per (routing + account) tuple. Prevents trial
    // farming by signing up under multiple emails with the same bank.
    // The check is profile-scoped: a legit user re-subscribing after
    // cancel hits the same profile_id and is allowed through.
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    const bankFingerprint = pm.us_bank_account?.fingerprint ?? null;
    if (bankFingerprint) {
      const { data: takenBy } = await admin
        .from('subscriptions')
        .select('profile_id')
        .eq('bank_fingerprint', bankFingerprint)
        .neq('profile_id', profile.id)
        .limit(1)
        .maybeSingle();
      if (takenBy) {
        return json({
          error:
            'This bank account is already linked to a different Pact account. ' +
            'If you need to use it on this account, email support@pact.show.',
        }, 409);
      }
    }

    // Idempotency: if we already created a subscription for this user,
    // reuse it rather than creating a duplicate. Cheaper than searching
    // — we read our own DB.
    const { data: existingRow } = await admin
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('profile_id', profile.id)
      .maybeSingle();

    let stripeSubscription: Stripe.Subscription;
    if (existingRow?.stripe_subscription_id) {
      stripeSubscription = await stripe.subscriptions.retrieve(
        existingRow.stripe_subscription_id,
      );
    } else {
      // Stripe-side idempotency: if a previous attempt created a
      // subscription but the DB write failed before we recorded the
      // ID, retrying without this check would create a SECOND Stripe
      // subscription on the same customer. Search first, reuse if
      // present.
      const existingOnStripe = await stripe.subscriptions.list({
        customer: customer_id,
        status: 'all',
        limit: 5,
      });
      const orphan = existingOnStripe.data.find(
        (s) =>
          s.metadata?.pact_user_id === user.id &&
          s.status !== 'canceled' &&
          s.status !== 'incomplete_expired',
      );
      if (orphan) {
        stripeSubscription = orphan;
      } else {
        stripeSubscription = await stripe.subscriptions.create({
        customer: customer_id,
        items: [{ price: priceId }],
        trial_period_days: 30,
        default_payment_method: paymentMethodId,
        payment_settings: {
          payment_method_types: ['us_bank_account'],
          save_default_payment_method: 'on_subscription',
        },
        // Carries through to invoices/charges so the webhook can map
        // back to our DB row without an extra lookup.
        metadata: {
          pact_user_id: user.id,
          pact_profile_id: profile.id,
          pact_tier: tier,
        },
      });
      }
    }

    // Atomic-ish DB write: profile.user_side + subscriptions row.
    // Both run as service_role, so RLS doesn't apply.
    const { error: profileUpdateErr } = await admin
      .from('profiles')
      .update({ user_side: side })
      .eq('id', profile.id);
    if (profileUpdateErr) {
      console.error('Failed to update profile.user_side:', profileUpdateErr);
      return json({ error: 'Failed to save side on profile' }, 500);
    }

    const { error: subUpsertErr } = await admin
      .from('subscriptions')
      .upsert(
        {
          profile_id: profile.id,
          tier,
          status: stripeStatusToDb(stripeSubscription.status),
          stripe_customer_id: customer_id,
          stripe_subscription_id: stripeSubscription.id,
          stripe_payment_method_id: paymentMethodId,
          bank_fingerprint: bankFingerprint,
          trial_ends_at: stripeSubscription.trial_end
            ? new Date(stripeSubscription.trial_end * 1000).toISOString()
            : null,
          current_period_end: stripeSubscription.current_period_end
            ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        },
        { onConflict: 'profile_id' },
      );
    if (subUpsertErr) {
      console.error('Failed to upsert subscription row:', subUpsertErr);
      return json({ error: 'Failed to save subscription' }, 500);
    }

    return json({
      ok: true,
      subscription_id: stripeSubscription.id,
      status: stripeSubscription.status,
      trial_ends_at: stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000).toISOString()
        : null,
    });
  } catch (err) {
    reportError('finalizeSubscription', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function stripeStatusToDb(s: Stripe.Subscription.Status): string {
  // Our enum is a strict subset; map anything unexpected to 'incomplete'
  // so we don't violate the enum constraint and lose the row.
  const allowed = new Set([
    'incomplete', 'incomplete_expired', 'trialing',
    'active', 'past_due', 'canceled', 'unpaid',
  ]);
  return allowed.has(s) ? s : 'incomplete';
}
