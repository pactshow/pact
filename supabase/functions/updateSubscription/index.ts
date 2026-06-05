import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';
import { clientIdentifier, rateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { validateBody, z } from '../_shared/validate.ts';

import { reportError } from '../_shared/sentry.ts';
const BodySchema = z.object({
  new_tier: z.enum(['artist_basic', 'artist_pro', 'promoter_basic', 'promoter_pro']),
});

// Tier upgrade / downgrade. Swaps the price item and prorates so the
// user is fairly charged for the time-weighted difference. Also flips
// cancel_at_period_end back to false so a "pending cancel" sub becomes
// active again on a tier change (matches expected SaaS UX).
//
// Restricts the swap to the same side: artists can switch
// artist_basic <-> artist_pro, promoters within their pair. A side
// switch isn't a tier change — that's a profile change and is out of
// scope for now.

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://www.pact.show',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
      key: 'updateSubscription',
      identifier: clientIdentifier(req, user.id),
      limit: 10,
      windowSec: 60,
    });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter, corsHeaders);

    const parsed = await validateBody(req, BodySchema);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const { new_tier } = parsed.data;
    const newPriceId = PRICE_FOR_TIER[new_tier];
    if (!newPriceId) return json({ error: 'Invalid tier' }, 400);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, user_side')
      .eq('user_id', user.id)
      .single();
    if (!profile) return json({ error: 'Profile not found' }, 404);

    if (!new_tier.startsWith(profile.user_side)) {
      return json({ error: 'New tier does not match your side' }, 400);
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, tier, status')
      .eq('profile_id', profile.id)
      .single();
    if (!sub?.stripe_subscription_id) {
      return json({ error: 'No subscription to update' }, 404);
    }
    if (sub.tier === new_tier) {
      return json({ error: 'Already on this tier' }, 409);
    }
    if (sub.status === 'canceled' || sub.status === 'incomplete_expired') {
      return json({ error: 'Cannot change tier on canceled subscription' }, 409);
    }

    // Stripe needs the existing item id to know which line to swap.
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const itemId = stripeSub.items.data[0]?.id;
    if (!itemId) return json({ error: 'Subscription has no items' }, 500);

    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
      proration_behavior: 'create_prorations',
      items: [{ id: itemId, price: newPriceId }],
      metadata: {
        ...stripeSub.metadata,
        pact_tier: new_tier,
      },
    });

    // Webhook will reconcile fully; this keeps the UI snappy.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    await admin
      .from('subscriptions')
      .update({
        tier: new_tier,
        cancel_at_period_end: false,
      })
      .eq('profile_id', profile.id);

    return json({
      ok: true,
      tier: new_tier,
      status: updated.status,
    });
  } catch (err) {
    reportError('updateSubscription', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
