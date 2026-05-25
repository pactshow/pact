-- =====================================================================
-- Pact. — Security hardening (audit findings)
--
-- Fixes:
--   #3 Field-level update guard on contracts: a contract participant
--      can only update fields belonging to their *own* side. They
--      cannot fake the other party's signature or dispute.
--   #4 Stripe webhook event deduplication table.
--   #7 Server-side dispute_window_closes calculation. Frontend no
--      longer has authority to set this value.
-- =====================================================================

-- ---------- 1. Stripe webhook event log -----------------------------------
create table if not exists stripe_webhook_events (
  stripe_event_id text primary key,
  event_type      text not null,
  received_at     timestamptz not null default now()
);

-- The webhook handler inserts into this from the service role; no RLS
-- needed because it's never read from the frontend.
alter table stripe_webhook_events disable row level security;

-- ---------- 2. Field-level guard on contracts -----------------------------
-- BEFORE UPDATE trigger that prevents either party from modifying fields
-- that belong to the other side. The service role bypasses this (cron,
-- webhook, edge functions running with service role can do anything).
create or replace function enforce_contract_field_ownership()
  returns trigger language plpgsql security definer as $$
declare
  caller_uid     uuid := auth.uid();
  caller_role    text := current_setting('request.jwt.claim.role', true);
  caller_profile_ids uuid[];
  is_contractor  boolean;
  is_client      boolean;
begin
  -- service_role bypass (cron, webhook, edge functions doing privileged work)
  if caller_role = 'service_role' or caller_uid is null then
    return new;
  end if;

  select array_agg(id) into caller_profile_ids
    from profiles where user_id = caller_uid;

  is_contractor := old.contractor_profile_id = any(caller_profile_ids);
  is_client     := old.client_profile_id     = any(caller_profile_ids);

  -- Contractor-side fields: only the contractor can change these.
  if (new.contractor_signature is distinct from old.contractor_signature
      or new.contractor_signed_date is distinct from old.contractor_signed_date
      or new.contractor_signed_device is distinct from old.contractor_signed_device
      or new.contractor_disputed is distinct from old.contractor_disputed
      or new.contractor_dispute_reason is distinct from old.contractor_dispute_reason
      or new.contractor_dispute_section is distinct from old.contractor_dispute_section
      or new.contractor_dispute_date is distinct from old.contractor_dispute_date)
     and not is_contractor then
    raise exception 'Only the contractor may modify contractor signature/dispute fields'
      using errcode = '42501';
  end if;

  -- Client-side fields: only the client can change these.
  if (new.client_signature is distinct from old.client_signature
      or new.client_signed_date is distinct from old.client_signed_date
      or new.client_signed_device is distinct from old.client_signed_device
      or new.client_disputed is distinct from old.client_disputed
      or new.client_dispute_reason is distinct from old.client_dispute_reason
      or new.client_dispute_section is distinct from old.client_dispute_section
      or new.client_dispute_date is distinct from old.client_dispute_date)
     and not is_client then
    raise exception 'Only the client may modify client signature/dispute fields'
      using errcode = '42501';
  end if;

  -- Frontend cannot directly bump these — they're set server-side by the
  -- ach_transfer trigger / cron / dispute_window trigger.
  if (new.dispute_window_closes is distinct from old.dispute_window_closes
      or new.ach_transfer_triggered is distinct from old.ach_transfer_triggered
      or new.ach_transfer_date is distinct from old.ach_transfer_date) then
    raise exception 'These fields are managed server-side and cannot be set directly'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists contracts_enforce_field_ownership on contracts;
create trigger contracts_enforce_field_ownership
  before update on contracts
  for each row execute function enforce_contract_field_ownership();

-- ---------- 3. Server-side dispute_window_closes calculation -------------
-- When both parties sign for the first time, set dispute_window_closes to
-- (performance_end_date or performance_date) + performance_time + 24h.
-- This trigger runs as the table owner so it can write the field that
-- enforce_contract_field_ownership just locked down for end-users.
create or replace function set_dispute_window_on_full_signature()
  returns trigger language plpgsql security definer as $$
declare
  ref_date  date;
  hh        int := 0;
  mm        int := 0;
  perf_ts   timestamp;
  m24       text[];
  m12       text[];
begin
  -- Only act when both signatures present and we haven't already set it.
  if new.contractor_signature is null or new.client_signature is null then
    return new;
  end if;
  if new.dispute_window_closes is not null then
    return new;
  end if;

  ref_date := coalesce(new.performance_end_date, new.performance_date);
  if ref_date is null then
    return new;
  end if;

  -- Parse performance_time. Accept "HH:MM" (new format from native time
  -- input) or "H:MM AM/PM" (legacy free-text values from old contracts).
  if new.performance_time is not null then
    m24 := regexp_match(new.performance_time, '^(\d{1,2}):(\d{2})$');
    if m24 is not null then
      hh := m24[1]::int;
      mm := m24[2]::int;
    else
      m12 := regexp_match(new.performance_time, '^(\d{1,2}):(\d{2})\s*(AM|PM)$', 'i');
      if m12 is not null then
        hh := m12[1]::int;
        mm := m12[2]::int;
        if upper(m12[3]) = 'PM' and hh <> 12 then hh := hh + 12; end if;
        if upper(m12[3]) = 'AM' and hh = 12 then hh := 0; end if;
      end if;
    end if;
  end if;

  perf_ts := ref_date::timestamp + make_interval(hours => hh, mins => mm);
  new.dispute_window_closes := (perf_ts + interval '24 hours') at time zone 'UTC';
  return new;
end;
$$;

drop trigger if exists contracts_set_dispute_window on contracts;
create trigger contracts_set_dispute_window
  before update on contracts
  for each row execute function set_dispute_window_on_full_signature();

-- The order of triggers matters: enforce_contract_field_ownership runs
-- first (alphabetical: 'contracts_enforce...' < 'contracts_set...'),
-- which validates that the user isn't tampering with dispute_window_closes,
-- then set_dispute_window_on_full_signature gets to populate it. The
-- ownership trigger checks `is distinct from old`; since the user submits
-- the same null value as old, it passes, and our trigger then fills it.
