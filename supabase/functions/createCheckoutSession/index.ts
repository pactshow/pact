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

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  deposit: 'Deposit',
  balance: 'Balance',
  full_payment: 'Full Payment',
  bonus: 'Bonus',
  other: 'Payment',
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

    const { payment_id, success_url, cancel_url } = await req.json();
    if (!payment_id) return json({ error: 'payment_id is required' }, 400);
    if (!success_url || !cancel_url) {
      return json({ error: 'success_url and cancel_url are required' }, 400);
    }

    // RLS will block this if the caller isn't a party to the contract.
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, contracts(*)')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      return json({ error: 'Payment not found' }, 404);
    }

    const contract = payment.contracts;
    if (!contract) return json({ error: 'Contract not found' }, 404);

    // Only the client side (the payer) can initiate checkout. Look up the
    // caller's profile and confirm they're the client on this contract.
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!callerProfile || callerProfile.id !== contract.client_profile_id) {
      return json({ error: 'Only the client can pay this contract' }, 403);
    }

    // Refuse double-payment.
    if (payment.stripe_charge_id || payment.status === 'paid') {
      return json({ error: 'Payment already captured' }, 409);
    }

    // Refuse before both parties have signed.
    if (!contract.contractor_signature || !contract.client_signature) {
      return json({ error: 'Contract is not fully signed' }, 400);
    }

    const amountCents = Math.round(Number(payment.amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return json({ error: 'Invalid payment amount' }, 400);
    }

    const typeLabel = PAYMENT_TYPE_LABEL[payment.type] ?? 'Payment';
    const productName = `${contract.title} — ${typeLabel}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          financial_connections: { permissions: ['payment_method'] },
          verification_method: 'instant',
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: productName,
              description: contract.description?.slice(0, 200) || undefined,
            },
          },
        },
      ],
      success_url,
      cancel_url,
      customer_email: user.email,
      client_reference_id: payment.id,
      payment_intent_data: {
        description: productName,
        metadata: {
          pact_payment_id: payment.id,
          pact_contract_id: contract.id,
          pact_payment_type: payment.type,
        },
      },
      metadata: {
        pact_payment_id: payment.id,
        pact_contract_id: contract.id,
      },
    });

    // Save the session id so the webhook can correlate. We use a service-role
    // client here because the user's RLS may not permit writes to payments
    // outside of contract-owner flows.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error: updateError } = await admin
      .from('payments')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Failed to save checkout session id:', updateError);
      // Not fatal — webhook will still work via metadata fallback.
    }

    return json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error('createCheckoutSession error:', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
