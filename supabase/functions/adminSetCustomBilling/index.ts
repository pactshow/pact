import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';

// Admin-only — set custom billing overrides on any subscription:
//   * custom_fee_bps: applied per-transaction in createPaymentIntent +
//     processDisputeWindowPayments
//   * custom_monthly_price_id: when provided AND different from the
//     current Stripe Price, swaps the actual Stripe Subscription too
//     (with proration), so the next bill uses the new amount.
//
// Webhook reconciles authoritative state; the DB write here is a
// snappy mirror so the admin sees the change immediately.

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

    // Caller must be an admin.
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();
    if (!callerProfile?.is_admin) {
      return json({ error: 'Admin only' }, 403);
    }

    const body = await req.json();
    const subscriptionId: string = body?.subscription_id;
    if (!subscriptionId) return json({ error: 'subscription_id required' }, 400);

    const customFeeBps: number | null = body?.custom_fee_bps ?? null;
    if (customFeeBps != null) {
      if (!Number.isInteger(customFeeBps) || customFeeBps < 0 || customFeeBps > 10_000) {
        return json({ error: 'custom_fee_bps must be 0-10000 (bps)' }, 400);
      }
    }

    const newPriceId: string | null = body?.custom_monthly_price_id || null;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Load the sub via service role (bypass RLS).
    const { data: sub, error: subErr } = await admin
      .from('subscriptions')
      .select('id, stripe_subscription_id, custom_monthly_price_id, status')
      .eq('id', subscriptionId)
      .single();
    if (subErr || !sub) return json({ error: 'Subscription not found' }, 404);

    let stripeSwapped = false;
    // Only swap Stripe when the price actually changed and the
    // subscription is in a state Stripe will let us edit.
    if (
      newPriceId
      && newPriceId !== sub.custom_monthly_price_id
      && sub.stripe_subscription_id
      && sub.status !== 'canceled'
      && sub.status !== 'incomplete_expired'
    ) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
        const itemId = stripeSub.items.data[0]?.id;
        if (!itemId) return json({ error: 'Stripe subscription has no items' }, 500);

        await stripe.subscriptions.update(sub.stripe_subscription_id, {
          proration_behavior: 'create_prorations',
          items: [{ id: itemId, price: newPriceId }],
          metadata: {
            ...stripeSub.metadata,
            pact_custom_billing: 'true',
          },
        });
        stripeSwapped = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Stripe price swap failed:', msg);
        return json({ error: `Stripe price swap failed: ${msg}` }, 502);
      }
    }

    const { error: updateErr } = await admin
      .from('subscriptions')
      .update({
        custom_fee_bps: customFeeBps,
        custom_monthly_price_id: newPriceId,
      })
      .eq('id', sub.id);
    if (updateErr) return json({ error: updateErr.message }, 500);

    return json({
      ok: true,
      stripe_swapped: stripeSwapped,
      custom_fee_bps: customFeeBps,
      custom_monthly_price_id: newPriceId,
    });
  } catch (err) {
    console.error('adminSetCustomBilling error:', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
