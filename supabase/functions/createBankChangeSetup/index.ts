import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';
import { clientIdentifier, rateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

import { reportError } from '../_shared/sentry.ts';
// Creates a SetupIntent on the user's existing Stripe Customer so they
// can swap the bank that gets billed for the subscription. Same shape
// of return as createSubscriptionSetup so the frontend can reuse the
// Stripe Elements <PaymentElement> mount with FC.

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://www.pact.show',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
});

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

    const rl = await rateLimit({
      key: 'createBankChangeSetup',
      identifier: clientIdentifier(req, user.id),
      limit: 10,
      windowSec: 60,
    });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter, corsHeaders);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!profile) return json({ error: 'Profile not found' }, 404);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('profile_id', profile.id)
      .single();
    if (!sub?.stripe_customer_id) {
      return json({ error: 'No subscription to update' }, 404);
    }

    // Belt-and-suspenders: re-validate the customer's metadata matches
    // this user. Defends against a misaligned subscription row.
    const customer = await stripe.customers.retrieve(sub.stripe_customer_id);
    if (customer.deleted || customer.metadata?.pact_user_id !== user.id) {
      return json({ error: 'Customer ownership mismatch' }, 403);
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: sub.stripe_customer_id,
      payment_method_types: ['us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          financial_connections: { permissions: ['payment_method'] },
          verification_method: 'instant',
        },
      },
      usage: 'off_session',
      metadata: {
        pact_user_id: user.id,
        pact_profile_id: profile.id,
        pact_intent: 'change_subscription_bank',
      },
    });

    return json({
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id,
      customer_id: sub.stripe_customer_id,
    });
  } catch (err) {
    reportError('createBankChangeSetup', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
