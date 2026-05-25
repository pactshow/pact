-- =====================================================================
-- Pact. — Paywall: require an active subscription to create contracts
--
-- Belt-and-suspenders enforcement. The frontend will route blocked
-- users to a Paywall screen, but a DB trigger guarantees nobody can
-- bypass via DevTools / direct PostgREST calls.
--
-- Allowed statuses: trialing, active, past_due
--   - past_due is the Stripe dunning window; Stripe is still retrying
--     ACH for a few weeks. Don't lock a paying customer out mid-retry.
--   - canceled / incomplete / incomplete_expired / unpaid → block.
--
-- Service role (cron, webhook, edge fns using service_role) bypasses:
-- when there's no JWT, auth.uid() is null and the trigger returns
-- early. This matches how the existing contract-ownership trigger
-- handles the same case (see 0009_security_hardening.sql).
--
-- Editing existing contracts is intentionally NOT blocked — once a
-- contract exists, both parties should always be able to manage it.
-- =====================================================================

create or replace function enforce_active_subscription_on_contract_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if not exists (
    select 1
    from subscriptions s
    join profiles p on p.id = s.profile_id
    where p.user_id = auth.uid()
      and s.status in ('trialing', 'active', 'past_due')
  ) then
    raise exception 'subscription_required: An active Pact subscription is required to create contracts'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists contracts_require_active_subscription on contracts;
create trigger contracts_require_active_subscription
  before insert on contracts
  for each row
  execute function enforce_active_subscription_on_contract_insert();

notify pgrst, 'reload schema';
