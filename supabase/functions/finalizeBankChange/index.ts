import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';

// Points the customer + active subscription at the freshly-linked
// PaymentMethod, persists the new PM id to our row, and detaches the
// old PM so the Stripe customer doesn't accumulate dead bank accounts.

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

    const { setup_intent_id } = await req.json();
    if (!setup_intent_id) return json({ error: 'setup_intent_id is required' }, 400);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!profile) return json({ error: 'Profile not found' }, 404);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, stripe_payment_method_id')
      .eq('profile_id', profile.id)
      .single();
    if (!sub?.stripe_customer_id) {
      return json({ error: 'No subscription found' }, 404);
    }

    const customer = await stripe.customers.retrieve(sub.stripe_customer_id);
    if (customer.deleted || customer.metadata?.pact_user_id !== user.id) {
      return json({ error: 'Customer ownership mismatch' }, 403);
    }

    const si = await stripe.setupIntents.retrieve(setup_intent_id);
    if (si.customer !== sub.stripe_customer_id) {
      return json({ error: 'SetupIntent / customer mismatch' }, 400);
    }
    if (si.status !== 'succeeded') {
      return json({ error: `SetupIntent not ready (status: ${si.status})` }, 400);
    }
    const newPmId = typeof si.payment_method === 'string'
      ? si.payment_method
      : si.payment_method?.id;
    if (!newPmId) return json({ error: 'SetupIntent has no payment method' }, 400);

    const oldPmId = sub.stripe_payment_method_id;

    // Make new PM the customer's default-for-invoices and (if a sub
    // exists) the subscription's explicit default_payment_method.
    await stripe.customers.update(sub.stripe_customer_id, {
      invoice_settings: { default_payment_method: newPmId },
    });

    if (sub.stripe_subscription_id) {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        default_payment_method: newPmId,
      });
    }

    // Detach the old PM. Wrapped — if it was already detached or the
    // PM record is gone, we don't want to break the bank-change flow.
    if (oldPmId && oldPmId !== newPmId) {
      try {
        await stripe.paymentMethods.detach(oldPmId);
      } catch (err) {
        console.warn('Failed to detach old PM (non-fatal):', err);
      }
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error: updErr } = await admin
      .from('subscriptions')
      .update({ stripe_payment_method_id: newPmId })
      .eq('profile_id', profile.id);
    if (updErr) throw updErr;

    return json({ ok: true });
  } catch (err) {
    console.error('finalizeBankChange error:', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
