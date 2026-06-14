-- =====================================================================
-- Pact. — Account deletion eligibility check
--
-- Phase 1 of the account-deletion flow (App Store Guideline 5.1.1(v)).
--
-- `can_delete_account()` returns a JSON object describing whether the
-- calling user can delete their account, and if not, why. The frontend
-- uses this to gate the Delete Account button and surface human
-- guidance ("cancel your subscription first", etc.).
--
-- Eligibility model: a deletion is BLOCKED when the user has obligations
-- that would screw a counterparty if their account disappeared:
--   * an active subscription Stripe is still billing
--   * contracts mid-negotiation (sent / received / countered)
--   * fully-signed contracts with money still in flight (payments in
--     pending/processing/overdue or ACH transfer not yet triggered)
--   * an open dispute that hasn't been resolved
--
-- Completed contracts (signed + settled, cancelled, or fully refunded)
-- are NOT blockers — the counterparty keeps the signed snapshot and the
-- profile FK becomes NULL when the row is deleted. The original schema
-- already wired `contractor_profile_id` / `client_profile_id` as
-- `on delete set null` so this works transparently.
-- =====================================================================

create or replace function can_delete_account()
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_profile_id   uuid;
  v_blockers     jsonb := '[]'::jsonb;
  v_sub_count    int;
  v_neg_count    int;
  v_money_count  int;
  v_dispute_count int;
begin
  if v_uid is null then
    raise exception 'must be authenticated' using errcode = '42501';
  end if;

  select id into v_profile_id
  from profiles
  where user_id = v_uid
  limit 1;

  -- No profile row → nothing to block on (covers Guest signup drop-offs)
  if v_profile_id is null then
    return jsonb_build_object('can_delete', true, 'blockers', '[]'::jsonb);
  end if;

  -- Active Stripe subscription
  select count(*) into v_sub_count
  from subscriptions
  where profile_id = v_profile_id
    and status in ('trialing', 'active', 'past_due');

  if v_sub_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'active_subscription',
      'message', 'Cancel your subscription before deleting your account.'
    ));
  end if;

  -- Contracts mid-negotiation (no money yet, but counterparty is waiting)
  select count(*) into v_neg_count
  from contracts
  where (contractor_profile_id = v_profile_id or client_profile_id = v_profile_id)
    and status in ('sent', 'received', 'countered');

  if v_neg_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'contracts_in_negotiation',
      'count', v_neg_count,
      'message', case
        when v_neg_count = 1 then 'You have 1 contract in negotiation. Finish signing or cancel it first.'
        else format('You have %s contracts in negotiation. Finish signing or cancel them first.', v_neg_count)
      end
    ));
  end if;

  -- Signed contracts with money still in flight
  select count(distinct c.id) into v_money_count
  from contracts c
  join payments p on p.contract_id = c.id
  where (c.contractor_profile_id = v_profile_id or c.client_profile_id = v_profile_id)
    and c.status = 'signed'
    and (
      p.status in ('pending', 'processing', 'overdue')
      or (p.status = 'paid' and c.ach_transfer_triggered = false)
    );

  if v_money_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'payments_in_flight',
      'count', v_money_count,
      'message', case
        when v_money_count = 1 then 'You have 1 contract with payments still in progress. Wait for them to settle.'
        else format('You have %s contracts with payments still in progress. Wait for them to settle.', v_money_count)
      end
    ));
  end if;

  -- Open disputes that haven't been resolved
  select count(*) into v_dispute_count
  from contracts
  where (contractor_profile_id = v_profile_id or client_profile_id = v_profile_id)
    and (contractor_disputed = true or client_disputed = true)
    and status not in ('completed', 'cancelled');

  if v_dispute_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'open_disputes',
      'count', v_dispute_count,
      'message', case
        when v_dispute_count = 1 then 'You have 1 open dispute. It must be resolved before you can delete your account.'
        else format('You have %s open disputes. They must be resolved before you can delete your account.', v_dispute_count)
      end
    ));
  end if;

  return jsonb_build_object(
    'can_delete', jsonb_array_length(v_blockers) = 0,
    'blockers', v_blockers
  );
end;
$$;

revoke all on function can_delete_account() from public;
grant execute on function can_delete_account() to authenticated;

notify pgrst, 'reload schema';
