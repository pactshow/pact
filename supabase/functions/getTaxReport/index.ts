import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';

// Tax-time aggregation for a Pro user: every contractor they paid in
// the requested year, with totals and what Stripe knows about that
// contractor's tax filing status.
//
// What we deliberately do NOT do:
//   * Store any tax PII on Pact's side. Stripe Connect Express
//     already collected SSN/EIN during KYC and is the merchant of
//     record — we're just surfacing what they have.
//   * Expose the actual SSN/EIN. Stripe's API doesn't return them
//     even masked, which is correct privacy posture. We surface a
//     boolean ("tax info on file") plus legal/business name.
//
// Aggregation: payments where the caller is the contract.client
// (i.e., they paid the contractor) and status='paid' and paid_date
// falls inside the requested calendar year.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
});

// Pact fee math — mirrors processDisputeWindowPayments. The tax report
// must report what the contractor actually received, not the contract's
// gross amount, otherwise the 1099-NEC totals are wrong for any
// fee_payer = 'contractor' or 'split' contract.
const PACT_FEE_BPS = parseInt(Deno.env.get('PACT_FEE_BPS') ?? '200', 10);

function contractorFeeShare(feeCents: number, feePayer: string): number {
  if (feePayer === 'client') return 0;
  if (feePayer === 'split') return Math.floor(feeCents / 2);
  return feeCents; // 'contractor' (default)
}

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

    const body = await req.json().catch(() => ({}));
    const yearRaw = Number(body?.year ?? new Date().getFullYear());
    if (!Number.isInteger(yearRaw) || yearRaw < 2020 || yearRaw > 2100) {
      return json({ error: 'Invalid year' }, 400);
    }
    const year = yearRaw;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!profile) return json({ error: 'Profile not found' }, 404);

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year + 1}-01-01`;

    // Two-step query rather than a join with embedded-resource filter
    // (the latter has subtle alias/PostgREST gotchas). Step 1: contracts
    // where this user is the client. Step 2: paid payments on those
    // contracts within the requested year. Then group in JS by
    // contractor profile.
    const { data: clientContracts, error: contractsErr } = await supabase
      .from('contracts')
      .select('id, title, contractor_profile_id, contractor_name, contractor_email, fee_payer')
      .eq('client_profile_id', profile.id);

    if (contractsErr) {
      console.error('getTaxReport contracts query error:', contractsErr);
      return json({ error: 'Failed to load contracts' }, 500);
    }

    const contractIds = (clientContracts ?? []).map((c) => c.id);
    if (contractIds.length === 0) {
      return json({
        year,
        contractors: [],
        totals: { gross_cents: 0, refunded_cents: 0, net_cents: 0, payment_count: 0 },
      });
    }

    type StoredContract = {
      id: string;
      title: string;
      contractor_profile_id: string | null;
      contractor_name: string | null;
      contractor_email: string | null;
      fee_payer: 'contractor' | 'client' | 'split' | null;
    };
    const contractById = new Map<string, StoredContract>();
    for (const c of clientContracts ?? []) contractById.set(c.id, c as StoredContract);

    const { data: rows, error: rowsErr } = await supabase
      .from('payments')
      .select('id, amount, refunded_amount_cents, paid_date, type, contract_id')
      .eq('status', 'paid')
      .in('contract_id', contractIds)
      .gte('paid_date', yearStart)
      .lt('paid_date', yearEnd);

    if (rowsErr) {
      console.error('getTaxReport payments query error:', rowsErr);
      return json({ error: 'Failed to load payments' }, 500);
    }

    type Row = {
      amount: number;
      refunded_amount_cents: number | null;
      paid_date: string | null;
      type: string;
      contract_id: string;
    };

    // Group by contractor identity. When the contractor IS a Pact user
    // (has profile_id), use it — that lets us hydrate Stripe tax info.
    // When they aren't (common: promoter pays someone outside Pact),
    // fall back to email-then-name as the group key. Without this
    // fallback, off-platform payments silently drop out of the report.
    type Group = {
      profile_id: string | null;
      fallback_name: string | null;
      fallback_email: string | null;
      total_paid_cents: number;
      total_refunded_cents: number;
      payment_count: number;
      last_paid_date: string | null;
      contract_ids: Set<string>;
    };
    const byContractor = new Map<string, Group>();

    for (const r of (rows ?? []) as Row[]) {
      const contract = contractById.get(r.contract_id);
      if (!contract) continue;

      const profId = contract.contractor_profile_id;
      const email = contract.contractor_email?.trim().toLowerCase() || null;
      const name = contract.contractor_name?.trim() || null;
      const feePayer = contract.fee_payer ?? 'contractor';

      let groupKey: string;
      if (profId) groupKey = `profile:${profId}`;
      else if (email) groupKey = `email:${email}`;
      else if (name) groupKey = `name:${name.toLowerCase()}`;
      else continue; // can't identify — skip

      const amountCents = Math.round(Number(r.amount ?? 0) * 100);
      const refundedAmountCents = Math.max(0, Number(r.refunded_amount_cents ?? 0));

      // What the contractor would have received if no refund had been
      // applied — the cron deducts only contractor's share of fee.
      const fullFeeCents = Math.floor((amountCents * PACT_FEE_BPS) / 10_000);
      const contractorFullFeeCents = contractorFeeShare(fullFeeCents, feePayer);
      const contractorGrossCents = amountCents - contractorFullFeeCents;

      // What the cron actually transfers (or would, after refund). The
      // refund-aware fee mirrors processDisputeWindowPayments: fee is
      // recomputed on the post-refund net.
      const postRefundCents = Math.max(0, amountCents - refundedAmountCents);
      const postRefundFeeCents = Math.floor((postRefundCents * PACT_FEE_BPS) / 10_000);
      const contractorPostRefundFeeCents = contractorFeeShare(postRefundFeeCents, feePayer);
      const contractorNetCents = postRefundCents - contractorPostRefundFeeCents;

      // The refund's effect on the contractor's payout — only the
      // contractor's share of the refund counts here. Pact's share
      // doesn't appear in 1099 totals.
      const contractorRefundShareCents = Math.max(0, contractorGrossCents - contractorNetCents);

      const entry = byContractor.get(groupKey) ?? {
        profile_id: profId,
        fallback_name: name,
        fallback_email: email,
        total_paid_cents: 0,
        total_refunded_cents: 0,
        payment_count: 0,
        last_paid_date: null,
        contract_ids: new Set<string>(),
      };
      entry.total_paid_cents += contractorGrossCents;
      entry.total_refunded_cents += contractorRefundShareCents;
      entry.payment_count += 1;
      entry.contract_ids.add(r.contract_id);
      if (r.paid_date && (!entry.last_paid_date || r.paid_date > entry.last_paid_date)) {
        entry.last_paid_date = r.paid_date;
      }
      byContractor.set(groupKey, entry);
    }

    if (byContractor.size === 0) {
      return json({
        year,
        contractors: [],
        totals: { gross_cents: 0, refunded_cents: 0, net_cents: 0, payment_count: 0 },
      });
    }

    // Hydrate Pact-user contractors with their profile + Stripe info.
    // Off-platform contractors keep just the denormalized name/email
    // captured on the contract.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const profileIds = Array.from(byContractor.values())
      .map((g) => g.profile_id)
      .filter((id): id is string => !!id);

    const profileById = new Map<string, {
      name: string | null;
      email: string | null;
      stripe_connect_account_id: string | null;
      stripe_onboarding_complete: boolean | null;
    }>();
    if (profileIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, name, email, stripe_connect_account_id, stripe_onboarding_complete')
        .in('id', profileIds);
      for (const p of profiles ?? []) profileById.set(p.id, p);
    }

    const contractors = await Promise.all(
      Array.from(byContractor.values()).map(async (agg) => {
        const p = agg.profile_id ? profileById.get(agg.profile_id) : null;
        let stripe_legal_name: string | null = null;
        let stripe_business_name: string | null = null;
        let stripe_business_type: string | null = null;
        let tax_id_on_file = false;

        if (p?.stripe_connect_account_id) {
          try {
            const acct = await stripe.accounts.retrieve(p.stripe_connect_account_id);
            stripe_business_type = acct.business_type ?? null;
            stripe_business_name = acct.company?.name ?? null;
            const first = acct.individual?.first_name ?? '';
            const last = acct.individual?.last_name ?? '';
            const indivName = `${first} ${last}`.trim();
            stripe_legal_name = indivName || null;
            tax_id_on_file =
              !!acct.company?.tax_id_provided ||
              !!acct.individual?.id_number_provided;
          } catch (err) {
            console.warn(`Failed to fetch Stripe account ${p.stripe_connect_account_id}:`, err);
          }
        }

        const net_cents = agg.total_paid_cents - agg.total_refunded_cents;

        return {
          profile_id: agg.profile_id,
          // Prefer the Pact profile's recorded name/email when we have
          // it; fall back to the contract-level snapshot otherwise.
          name: p?.name ?? agg.fallback_name,
          email: p?.email ?? agg.fallback_email,
          // True when the contractor isn't a Pact user — UI can flag
          // these as "off-platform — ask for a W-9 directly."
          off_platform: !agg.profile_id,
          stripe_legal_name,
          stripe_business_name,
          stripe_business_type,
          tax_id_on_file,
          stripe_onboarding_complete: !!p?.stripe_onboarding_complete,
          total_paid_cents: agg.total_paid_cents,
          total_refunded_cents: agg.total_refunded_cents,
          net_paid_cents: net_cents,
          payment_count: agg.payment_count,
          contract_count: agg.contract_ids.size,
          last_paid_date: agg.last_paid_date,
          over_1099_threshold: net_cents >= 60_000,
        };
      }),
    );

    contractors.sort((a, b) => b.net_paid_cents - a.net_paid_cents);

    const totals = contractors.reduce(
      (acc, c) => ({
        gross_cents: acc.gross_cents + c.total_paid_cents,
        refunded_cents: acc.refunded_cents + c.total_refunded_cents,
        net_cents: acc.net_cents + c.net_paid_cents,
        payment_count: acc.payment_count + c.payment_count,
      }),
      { gross_cents: 0, refunded_cents: 0, net_cents: 0, payment_count: 0 },
    );

    return json({ year, contractors, totals });
  } catch (err) {
    console.error('getTaxReport error:', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
