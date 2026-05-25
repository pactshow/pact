import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';

// Un-cancel a subscription that was scheduled to end at period end.
// Only valid before period end actually arrives — once the subscription
// has terminally canceled, this returns an error and the user has to
// resubscribe (which we don't support in-app yet).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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
      return json({ error: 'No subscription to resume' }, 404);
    }
    if (sub.status === 'canceled') {
      return json({ error: 'Subscription has already ended' }, 409);
    }
    if (!sub.cancel_at_period_end) {
      return json({ ok: true, already_active: true });
    }

    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    await admin
      .from('subscriptions')
      .update({ cancel_at_period_end: false })
      .eq('profile_id', profile.id);

    return json({
      ok: true,
      cancel_at_period_end: updated.cancel_at_period_end,
    });
  } catch (err) {
    console.error('resumeSubscription error:', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
