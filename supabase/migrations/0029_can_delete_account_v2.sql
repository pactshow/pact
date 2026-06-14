-- =====================================================================
-- Pact. — can_delete_account() v2: respect cancel_at_period_end
--
-- v1 (migration 0028) blocked deletion whenever the subscription status
-- was active/trialing/past_due. That's surprising for users who already
-- canceled — they have to wait until the period-end date to delete, even
-- though they've effectively done what the gate asked for.
--
-- v2 only blocks when there's an active subscription that ISN'T already
-- scheduled to cancel. The deleteAccount edge function defensively cancels
-- in Stripe immediately when the auth user is deleted, so opening the gate
-- here doesn't leave a dangling charge.
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

  if v_profile_id is null then
    return jsonb_build_object('can_delete', true, 'blockers', '[]'::jsonb);
  end if;

  -- Active Stripe subscription that hasn't been canceled yet.
  -- cancel_at_period_end=true means the user already canceled; let them go.
  select count(*) into v_sub_count
  from subscriptions
  where profile_id = v_profile_id
    and status in ('trialing', 'active', 'past_due')
    and cancel_at_period_end = false;

  if v_sub_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'active_subscription',
      'message', 'Cancel your subscription before deleting your account.'
    ));
  end if;

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

notify pgrst, 'reload schema';
