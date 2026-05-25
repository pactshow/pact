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

    const { profile_id, return_url, refresh_url } = await req.json();
    if (!profile_id) return json({ error: 'profile_id is required' }, 400);
    if (!return_url || !refresh_url) {
      return json({ error: 'return_url and refresh_url are required' }, 400);
    }

    // RLS: user can only read/update profiles they own.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile_id)
      .single();

    if (profileError || !profile) {
      return json({ error: 'Profile not found' }, 404);
    }

    let accountId = profile.stripe_connect_account_id as string | null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: profile.email || user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          pact_profile_id: profile.id,
          pact_user_id: user.id,
        },
      });
      accountId = account.id;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', profile_id);

      if (updateError) {
        console.error('Failed to save connect_account_id:', updateError);
        return json({ error: 'Failed to save Stripe account on profile' }, 500);
      }
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url,
      return_url,
      type: 'account_onboarding',
    });

    return json({ url: link.url, account_id: accountId });
  } catch (err) {
    console.error('createConnectOnboardingLink error:', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
