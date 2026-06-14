import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';
import { clientIdentifier, rateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

import { reportError } from '../_shared/sentry.ts';
import { corsHeaders as buildCors } from '../_shared/cors.ts';
// Single round-trip for the Account tab. Returns the data the UI needs
// from Stripe (bank last4, invoice history) plus enough context to
// render the current-plan card without re-querying.
//
// Server-side only because we don't want to ship the Stripe secret to
// the browser. Reads our own subscription row to find the customer +
// validate ownership, then queries Stripe.

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
      key: 'getSubscriptionDetails',
      identifier: clientIdentifier(req, user.id),
      limit: 60,
      windowSec: 60,
    });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter, corsHeaders);

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
      // Onboarded user with no Stripe customer is an inconsistent state
      // we shouldn't pretend doesn't exist — surface it.
      return json({ error: 'No subscription found' }, 404);
    }

    // Bank details from the current default PM. The subscription's
    // `default_payment_method` is authoritative, but we also fall back
    // to whatever's on the row if Stripe hasn't replied yet.
    let bank: { last4: string | null; bank_name: string | null } | null = null;
    if (sub.stripe_payment_method_id) {
      try {
        const pm = await stripe.paymentMethods.retrieve(sub.stripe_payment_method_id);
        bank = {
          last4: pm.us_bank_account?.last4 ?? null,
          bank_name: pm.us_bank_account?.bank_name ?? null,
        };
      } catch (err) {
        console.warn('Failed to retrieve PM:', err);
      }
    }

    // Invoice history. Limit 12 = roughly a year of monthly bills, plus
    // any one-off proration invoices from tier changes.
    const invoices = await stripe.invoices.list({
      customer: sub.stripe_customer_id,
      limit: 12,
    });

    const billing_history = invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      created: inv.created,
      amount_paid: inv.amount_paid,
      amount_due: inv.amount_due,
      status: inv.status,
      hosted_invoice_url: inv.hosted_invoice_url,
      invoice_pdf: inv.invoice_pdf,
      period_start: inv.period_start,
      period_end: inv.period_end,
    }));

    return json({ bank, billing_history });
  } catch (err) {
    reportError('getSubscriptionDetails', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
