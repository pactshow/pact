import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';
import { clientIdentifier, rateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { validateBody, z } from '../_shared/validate.ts';

import { reportError } from '../_shared/sentry.ts';
import { corsHeaders as buildCors } from '../_shared/cors.ts';
const BodySchema = z.object({
  setup_intent_id: z
    .string()
    .regex(/^seti_[A-Za-z0-9]{1,64}$/, 'must be a Stripe SetupIntent id'),
});

// Points the customer + active subscription at the freshly-linked
// PaymentMethod, persists the new PM id to our row, and detaches the
// old PM so the Stripe customer doesn't accumulate dead bank accounts.

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
});

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
      key: 'finalizeBankChange',
      identifier: clientIdentifier(req, user.id),
      limit: 10,
      windowSec: 60,
    });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter, corsHeaders);

    const parsed = await validateBody(req, BodySchema);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const { setup_intent_id } = parsed.data;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!profile) return json({ error: 'Profile not found' }, 404);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, stripe_payment_method_id')
      .eq('profile_id', profile.id)
      .single();
    if (!sub?.stripe_customer_id) {
      return json({ error: 'No subscription found' }, 404);
    }

    const customer = await stripe.customers.retrieve(sub.stripe_customer_id);
    if (customer.deleted || customer.metadata?.pact_user_id !== user.id) {
      return json({ error: 'Customer ownership mismatch' }, 403);
    }

    const si = await stripe.setupIntents.retrieve(setup_intent_id);
    if (si.customer !== sub.stripe_customer_id) {
      return json({ error: 'SetupIntent / customer mismatch' }, 400);
    }
    if (si.status !== 'succeeded') {
      return json({ error: `SetupIntent not ready (status: ${si.status})` }, 400);
    }
    const newPmId = typeof si.payment_method === 'string'
      ? si.payment_method
      : si.payment_method?.id;
    if (!newPmId) return json({ error: 'SetupIntent has no payment method' }, 400);

    const oldPmId = sub.stripe_payment_method_id;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Bank-fingerprint dedup — same check as finalizeSubscription. A
    // user can't sidestep the no-dupe-trial rule by signing up with a
    // throwaway bank, then "changing" to the bank already used by their
    // primary account.
    const newPm = await stripe.paymentMethods.retrieve(newPmId);
    const bankFingerprint = newPm.us_bank_account?.fingerprint ?? null;
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

    // Make new PM the customer's default-for-invoices and (if a sub
    // exists) the subscription's explicit default_payment_method.
    await stripe.customers.update(sub.stripe_customer_id, {
      invoice_settings: { default_payment_method: newPmId },
    });

    if (sub.stripe_subscription_id) {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        default_payment_method: newPmId,
      });
    }

    // Detach the old PM. Wrapped — if it was already detached or the
    // PM record is gone, we don't want to break the bank-change flow.
    if (oldPmId && oldPmId !== newPmId) {
      try {
        await stripe.paymentMethods.detach(oldPmId);
      } catch (err) {
        console.warn('Failed to detach old PM (non-fatal):', err);
      }
    }

    const { error: updErr } = await admin
      .from('subscriptions')
      .update({
        stripe_payment_method_id: newPmId,
        bank_fingerprint: bankFingerprint,
      })
      .eq('profile_id', profile.id);
    if (updErr) throw updErr;

    return json({ ok: true });
  } catch (err) {
    reportError('finalizeBankChange', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
