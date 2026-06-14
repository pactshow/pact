import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';
import { clientIdentifier, rateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { validateBody, z } from '../_shared/validate.ts';

import { reportError } from '../_shared/sentry.ts';
import { corsHeaders as buildCors } from '../_shared/cors.ts';
const BodySchema = z.object({
  subscription_id: z.string().uuid(),
  custom_fee_bps: z.number().int().min(0).max(10_000).nullable().optional(),
  custom_monthly_price_id: z
    .string()
    .regex(/^price_[A-Za-z0-9]{1,64}$/, 'must be a Stripe Price id')
    .nullable()
    .optional(),
});

// Admin-only — set custom billing overrides on any subscription:
//   * custom_fee_bps: applied per-transaction in createPaymentIntent +
//     processDisputeWindowPayments
//   * custom_monthly_price_id: when provided AND different from the
//     current Stripe Price, swaps the actual Stripe Subscription too
//     (with proration), so the next bill uses the new amount.
//
// Webhook reconciles authoritative state; the DB write here is a
// snappy mirror so the admin sees the change immediately.

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

    // Caller must be an admin.
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();
    if (!callerProfile?.is_admin) {
      return json({ error: 'Admin only' }, 403);
    }

    const rl = await rateLimit({
      key: 'adminSetCustomBilling',
      identifier: clientIdentifier(req, user.id),
      limit: 10,
      windowSec: 60,
    });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter, corsHeaders);

    const parsed = await validateBody(req, BodySchema);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const subscriptionId = parsed.data.subscription_id;
    const customFeeBps = parsed.data.custom_fee_bps ?? null;
    const newPriceId = parsed.data.custom_monthly_price_id || null;

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
    reportError('adminSetCustomBilling', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
