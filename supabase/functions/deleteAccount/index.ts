import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.21.0';
import { clientIdentifier, rateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { reportError } from '../_shared/sentry.ts';
import { corsHeaders as buildCors } from '../_shared/cors.ts';

// Account deletion (App Store Guideline 5.1.1(v)).
//
// Order matters: defensive Stripe cancel → hard-delete drafts (and their
// storage uploads) → auth.admin.deleteUser. The auth delete cascades to
// profiles, which cascades to subscriptions / notifications / event_groups /
// clause_library / contract_templates / connections, and which sets
// contractor_profile_id / client_profile_id to NULL on settled contracts
// (the schema's `on delete set null` preserves the counterparty's signed
// snapshot — see contracts.contractor_name + contractor_signature).

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

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supa.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    // Aggressive cap — irreversible action, no reason for repeat calls.
    const rl = await rateLimit({
      key: 'deleteAccount',
      identifier: clientIdentifier(req, user.id),
      limit: 3,
      windowSec: 3600,
    });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter, corsHeaders);

    const body = await req.json().catch(() => ({}));
    const confirmUsername = typeof body?.confirm_username === 'string'
      ? body.confirm_username.trim().toLowerCase()
      : '';

    // Re-verify eligibility server-side (don't trust client)
    const { data: eligibility, error: rpcErr } = await supa.rpc('can_delete_account');
    if (rpcErr) {
      reportError('deleteAccount', rpcErr, { stage: 'eligibility', user_id: user.id });
      return json({ error: 'Could not verify deletion eligibility' }, 500);
    }
    if (!eligibility?.can_delete) {
      return json(
        { error: 'Not eligible for deletion', blockers: eligibility?.blockers ?? [] },
        409,
      );
    }

    const { data: profile } = await supa
      .from('profiles')
      .select('id, username')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile?.username) {
      if (confirmUsername !== profile.username.toLowerCase()) {
        return json({ error: 'Username confirmation does not match' }, 400);
      }
    } else if (!profile) {
      // Drop-out signup (auth user without a profile) — no challenge needed.
    } else {
      // Profile without username (legacy) — require confirmation phrase.
      if (confirmUsername !== 'delete my account') {
        return json({ error: 'Type "delete my account" to confirm' }, 400);
      }
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const profileId = profile?.id ?? null;

    // Defensive Stripe cancel — covers a race where a sub was created between
    // eligibility check and now. Eligibility says there isn't one; this is belt+suspenders.
    if (profileId) {
      const { data: sub } = await admin
        .from('subscriptions')
        .select('stripe_subscription_id, status')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (sub?.stripe_subscription_id && sub.status !== 'canceled') {
        try {
          await stripe.subscriptions.cancel(sub.stripe_subscription_id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          // Already canceled / not found → fine, keep going. Anything else → bail.
          if (!/already canceled|No such subscription/i.test(msg)) {
            reportError('deleteAccount', err, { stage: 'stripe-cancel', user_id: user.id });
            return json({ error: 'Could not cancel Stripe subscription' }, 500);
          }
        }
      }
    }

    // Hard-delete drafts (counterparty has no claim yet) and their uploaded files.
    // We do this BEFORE auth.deleteUser so we can find them by created_by; after
    // cascade, contractor_profile_id is NULL and we can't tell drafts apart from
    // legacy orphans.
    if (profileId) {
      const { data: drafts } = await admin
        .from('contracts')
        .select('id, uploaded_file_path')
        .eq('created_by', user.id)
        .eq('status', 'draft');

      const draftRows = drafts ?? [];
      const uploadPaths = draftRows
        .map((d: { uploaded_file_path: string | null }) => d.uploaded_file_path)
        .filter((p: string | null): p is string => typeof p === 'string' && p.length > 0);

      if (draftRows.length > 0) {
        const draftIds = draftRows.map((d: { id: string }) => d.id);
        const { error: delDraftsErr } = await admin
          .from('contracts')
          .delete()
          .in('id', draftIds);
        if (delDraftsErr) {
          reportError('deleteAccount', delDraftsErr, { stage: 'delete-drafts', user_id: user.id });
          return json({ error: 'Could not delete draft contracts' }, 500);
        }
      }

      if (uploadPaths.length > 0) {
        const { error: storageErr } = await admin
          .storage
          .from('contract-uploads')
          .remove(uploadPaths);
        // Non-fatal: orphan files are storage cost, not a correctness issue.
        if (storageErr) {
          reportError('deleteAccount', storageErr, {
            stage: 'storage-cleanup',
            user_id: user.id,
            paths: uploadPaths.length,
          });
        }
      }
    }

    // The big one: cascades take care of the rest.
    const { error: delUserErr } = await admin.auth.admin.deleteUser(user.id);
    if (delUserErr) {
      reportError('deleteAccount', delUserErr, { stage: 'auth-delete', user_id: user.id });
      return json({ error: 'Failed to delete account', detail: delUserErr.message }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    reportError('deleteAccount', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
