import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';
import { clientIdentifier, rateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { validateBody, z } from '../_shared/validate.ts';

import { reportError } from '../_shared/sentry.ts';
const BodySchema = z.object({
  profile_id: z.string().uuid(),
});

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
      key: 'createConnectAccountSession',
      identifier: clientIdentifier(req, user.id),
      limit: 10,
      windowSec: 60,
    });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter, corsHeaders);

    const parsed = await validateBody(req, BodySchema);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const { profile_id } = parsed.data;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile_id)
      .single();

    if (profileError || !profile) return json({ error: 'Profile not found' }, 404);

    // Authorization: only the profile owner may create/refresh a Connect
    // session for their own profile. Without this, any authenticated user
    // could create a Stripe Connect account on someone else's profile by
    // passing a foreign profile_id (RLS allows reading any profile).
    if (profile.user_id !== user.id) {
      return json({ error: 'You can only set up payouts for your own profile' }, 403);
    }

    let accountId = profile.stripe_connect_account_id as string | null;

    if (!accountId) {
      // Pre-fill what Stripe will otherwise ask for in onboarding. Anything
      // we provide here, the user doesn't have to type — fewer steps inside
      // the onboarding flow (and on mobile, fewer forced redirects to
      // Stripe-hosted screens).
      //
      // Pact is purpose-built for live music performers, so we know the
      // industry (MCC 7929 — Bands, Orchestras, Entertainers) and can give
      // Stripe a generic product description on the user's behalf. This
      // makes the "Your website" / "What do you sell" steps disappear from
      // the onboarding flow entirely.
      const phoneE164 = normalizePhoneToE164(profile.phone);
      const [firstName, ...rest] = (profile.name ?? '').trim().split(/\s+/);
      const lastName = rest.join(' ') || undefined;
      const isBusiness = profile.entity_type === 'business';

      const baseParams: Stripe.AccountCreateParams = {
        type: 'express',
        country: 'US',
        email: profile.email || user.email,
        capabilities: { transfers: { requested: true } },
        business_type: isBusiness ? 'company' : 'individual',
        business_profile: {
          mcc: '7929',
          product_description:
            'Live music performance and related services for venues, promoters, and event hosts, contracted through the Pact platform.',
          ...(profile.website ? { url: profile.website } : {}),
        },
        metadata: {
          pact_profile_id: profile.id,
          pact_user_id: user.id,
        },
      };

      if (isBusiness) {
        baseParams.company = {
          ...(profile.business_name ? { name: profile.business_name } : {}),
          ...(phoneE164 ? { phone: phoneE164 } : {}),
        };
        // Stripe still wants a representative person for company accounts.
        // We provide what we know; the rep finishes their own info during
        // onboarding.
        baseParams.individual = {
          ...(firstName ? { first_name: firstName } : {}),
          ...(lastName ? { last_name: lastName } : {}),
          ...(phoneE164 ? { phone: phoneE164 } : {}),
          ...(profile.email ? { email: profile.email } : {}),
        };
      } else {
        baseParams.individual = {
          ...(firstName ? { first_name: firstName } : {}),
          ...(lastName ? { last_name: lastName } : {}),
          ...(phoneE164 ? { phone: phoneE164 } : {}),
          ...(profile.email ? { email: profile.email } : {}),
        };
      }

      const account = await stripe.accounts.create(baseParams);
      accountId = account.id;

      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { error: updateError } = await admin
        .from('profiles')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', profile_id);

      if (updateError) {
        return json({ error: 'Failed to save Stripe account on profile' }, 500);
      }
    }

    const accountSession = await stripe.accountSessions.create({
      account: accountId!,
      components: {
        account_onboarding: {
          enabled: true,
          features: { external_account_collection: true },
        },
      },
    });

    return json({ client_secret: accountSession.client_secret, account_id: accountId });
  } catch (err) {
    reportError('createConnectAccountSession', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Strip user formatting and convert to Stripe's E.164 format.
// "(555) 123-4567" → "+15551234567". Leaves valid E.164 input alone.
// Returns null if the result isn't plausibly a US/Canada number.
function normalizePhoneToE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\+\d{10,15}$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}
