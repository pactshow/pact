import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';

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

    const { profile_id } = await req.json();
    if (!profile_id) return json({ error: 'profile_id is required' }, 400);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile_id)
      .single();

    if (profileError || !profile) {
      return json({ error: 'Profile not found' }, 404);
    }

    if (profile.user_id !== user.id) {
      return json({ error: 'You can only refresh status for your own profile' }, 403);
    }

    if (!profile.stripe_connect_account_id) {
      return json({
        onboarding_complete: false,
        details_submitted: false,
        charges_enabled: false,
        payouts_enabled: false,
      });
    }

    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);

    const onboardingComplete = Boolean(
      account.details_submitted && account.charges_enabled && account.payouts_enabled,
    );

    if (onboardingComplete !== profile.stripe_onboarding_complete) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_onboarding_complete: onboardingComplete })
        .eq('id', profile_id);

      if (updateError) {
        console.error('Failed to update onboarding_complete:', updateError);
      }
    }

    return json({
      onboarding_complete: onboardingComplete,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements,
    });
  } catch (err) {
    console.error('refreshConnectStatus error:', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
