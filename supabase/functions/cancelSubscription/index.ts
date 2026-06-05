import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';
import { clientIdentifier, rateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

import { reportError } from '../_shared/sentry.ts';
// Soft cancel — sets cancel_at_period_end so the user keeps access
// until the end of their current paid period (or trial). The row's
// status flip + final 'canceled' will arrive via webhook.
//
// Hard immediate cancel is intentionally not exposed; if we need it
// later we can add { immediate: true } here.

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
      key: 'cancelSubscription',
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
      .select('stripe_subscription_id, status, cancel_at_period_end')
      .eq('profile_id', profile.id)
      .single();
    if (!sub?.stripe_subscription_id) {
      return json({ error: 'No active subscription' }, 404);
    }
    if (sub.status === 'canceled') {
      return json({ error: 'Subscription already canceled' }, 409);
    }
    if (sub.cancel_at_period_end) {
      return json({ ok: true, already_scheduled: true });
    }

    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Optimistic local mirror — webhook will reconcile.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    await admin
      .from('subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('profile_id', profile.id);

    return json({
      ok: true,
      cancel_at_period_end: updated.cancel_at_period_end,
      current_period_end: updated.current_period_end
        ? new Date(updated.current_period_end * 1000).toISOString()
        : null,
    });
  } catch (err) {
    reportError('cancelSubscription', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
