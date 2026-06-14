import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';
import { clientIdentifier, rateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { validateBody, z } from '../_shared/validate.ts';

import { reportError } from '../_shared/sentry.ts';
import { corsHeaders as buildCors } from '../_shared/cors.ts';
const BodySchema = z.object({
  side: z.enum(['artist', 'promoter']),
  tier: z.enum(['artist_basic', 'artist_pro', 'promoter_basic', 'promoter_pro']),
});

// Onboarding step 3 — Customer + SetupIntent for the bank-link.
//
// Returns a SetupIntent client_secret the frontend uses to mount a
// <PaymentElement> with Financial Connections. The user picks their
// bank inside Stripe Elements; the SetupIntent confirmation attaches
// the resulting us_bank_account PaymentMethod to the Customer.
//
// This function does NO database writes. The DB only changes after
// the bank link succeeds and finalizeSubscription runs — that way a
// drop-off mid-onboarding leaves no orphaned 'incomplete' rows behind.
// The customer_id we return is round-tripped to finalizeSubscription;
// that function re-validates the customer's metadata against auth.uid
// before doing anything with it.

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
      key: 'createSubscriptionSetup',
      identifier: clientIdentifier(req, user.id),
      limit: 10,
      windowSec: 60,
    });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter, corsHeaders);

    const parsed = await validateBody(req, BodySchema);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const { side, tier } = parsed.data;
    if (!tier.startsWith(side)) {
      return json({ error: 'Tier does not match side' }, 400);
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('user_id', user.id)
      .single();

    if (profileErr || !profile) return json({ error: 'Profile not found' }, 404);

    // Look up an existing Stripe Customer by metadata, otherwise create
    // one. We use search rather than persisting customer_id on the
    // profile because (a) it avoids a schema migration in this phase
    // and (b) the customer_id we return to the client is re-validated
    // server-side in finalizeSubscription, so this isn't a trust path.
    let customerId: string | null = null;
    const found = await stripe.customers.search({
      query: `metadata['pact_user_id']:'${user.id}'`,
      limit: 1,
    });
    if (found.data.length > 0) {
      customerId = found.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: profile.email ?? user.email,
        name: profile.name ?? undefined,
        metadata: {
          pact_user_id: user.id,
          pact_profile_id: profile.id,
        },
      });
      customerId = customer.id;
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
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
        pact_intent: 'subscription_billing',
        pact_tier: tier,
        pact_side: side,
      },
    });

    return json({
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id,
      customer_id: customerId,
    });
  } catch (err) {
    reportError('createSubscriptionSetup', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
