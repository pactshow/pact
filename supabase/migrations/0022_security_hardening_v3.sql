-- =====================================================================
-- Pact. — Security hardening v3 (2026-06-04)
--
-- Closes findings from the red-team pass after 0021:
--   Fix A — handle_new_user accepted accounts with no ToS consent
--   Fix B — set_dispute_window let a contract sign with a past performance
--           date, opening the dispute window in the past (cron transfers
--           immediately)
--   Fix C — paywall trigger let past_due continue indefinitely through
--           Stripe's ~3-week dunning window
--   Fix D — no dedup on bank account, enabling cheap multi-trial abuse
-- =====================================================================


-- ---------- Fix A: handle_new_user must require ToS consent ----------
-- 0021 stamped tos_accepted_at server-side when tos_version was non-empty
-- — but it didn't reject the signup when no version was supplied. A
-- client calling supabase.auth.signUp directly (bypassing the UI) could
-- create an account with no recorded consent.
create or replace function handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_tos_version text := nullif(new.raw_user_meta_data->>'tos_version', '');
begin
  if v_tos_version is null then
    raise exception 'tos_version is required at signup' using errcode = '42501';
  end if;

  insert into public.profiles (user_id, name, email, tos_accepted_at, tos_version)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Unnamed'),
    new.email,
    now(),
    v_tos_version
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;


-- ---------- Fix B: signing a contract with a past performance date ----
-- Migration 0009 computed dispute_window_closes = performance_ts + 24h.
-- Nothing required performance_ts to be in the future, so a draft with
-- performance_date = '2020-01-01' could be fully signed and the dispute
-- window would close immediately — the next cron run transfers funds
-- with no chance to dispute.
--
-- Reject full signature if the computed performance timestamp has already
-- passed by more than a small grace window (allows for clock skew and
-- legit same-day signing right after the gig ends).
create or replace function set_dispute_window_on_full_signature()
  returns trigger language plpgsql security definer as $$
declare
  ref_date  date;
  hh        int := 0;
  mm        int := 0;
  perf_ts   timestamp;
  perf_tsz  timestamptz;
  m24       text[];
  m12       text[];
begin
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
  perf_tsz := perf_ts at time zone 'UTC';

  -- Reject signing if the performance is more than 24h in the past.
  -- 24h grace accommodates day-of signing across timezones / legit
  -- after-the-fact paperwork. Beyond that, the dispute window has
  -- effectively expired before it opened — the cron would transfer on
  -- the next run with no chance to dispute.
  if perf_tsz < (now() - interval '24 hours') then
    raise exception 'cannot finalize a contract whose performance date has already passed'
      using errcode = '22008';
  end if;

  new.dispute_window_closes := perf_tsz + interval '24 hours';
  return new;
end;
$$;


-- ---------- Fix C: cap past_due at 7 days for the paywall ----------
-- Stripe's ACH dunning retries take ~3 weeks before status flips to
-- 'unpaid' or 'canceled'. During that whole window, the paywall let the
-- caller keep creating contracts on a sub that hasn't successfully paid.
-- 7 days is enough to cover a single failed retry + the bank fixing
-- their NSF, but caps the indefinite freeloading window.

alter table subscriptions
  add column if not exists first_past_due_at timestamptz,
  add column if not exists bank_fingerprint  text;

create index if not exists idx_subscriptions_bank_fingerprint
  on subscriptions (bank_fingerprint)
  where bank_fingerprint is not null;

-- Maintain first_past_due_at automatically from status transitions.
-- The webhook only writes `status`; this trigger does the rest, so the
-- webhook stays a dumb mirror of Stripe and never forgets to update the
-- stamp. Service-role bypass not needed — this runs BEFORE on every
-- update regardless of caller.
create or replace function maintain_first_past_due_at()
  returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'past_due' then
      new.first_past_due_at := coalesce(new.first_past_due_at, now());
    else
      new.first_past_due_at := null;
    end if;
    return new;
  end if;

  -- UPDATE
  if new.status = 'past_due' and old.status is distinct from 'past_due' then
    new.first_past_due_at := coalesce(new.first_past_due_at, now());
  elsif new.status <> 'past_due' and old.status = 'past_due' then
    new.first_past_due_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists subscriptions_maintain_first_past_due on subscriptions;
drop trigger if exists a_subscriptions_maintain_first_past_due on subscriptions;
-- Name with 'a_' prefix so it runs BEFORE subscriptions_enforce_field_ownership
-- alphabetically — otherwise the field-ownership trigger would reject the
-- trigger's own write when a non-service-role caller updates status.
-- Fires on INSERT too so a sub initially created in past_due gets stamped.
create trigger a_subscriptions_maintain_first_past_due
  before insert or update on subscriptions
  for each row execute function maintain_first_past_due_at();

create or replace function enforce_active_subscription_on_contract_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status         text;
  v_first_past_due timestamptz;
begin
  if auth.uid() is null then
    return new;
  end if;

  select s.status, s.first_past_due_at
    into v_status, v_first_past_due
  from subscriptions s
  join profiles p on p.id = s.profile_id
  where p.user_id = auth.uid()
  limit 1;

  if v_status is null or v_status not in ('trialing', 'active', 'past_due') then
    raise exception 'subscription_required: An active Pact subscription is required to create contracts'
      using errcode = '42501';
  end if;

  if v_status = 'past_due'
     and v_first_past_due is not null
     and v_first_past_due < (now() - interval '7 days') then
    raise exception 'subscription_required: Your subscription payment failed more than 7 days ago — please update your bank to continue creating contracts'
      using errcode = '42501';
  end if;

  return new;
end;
$$;


-- ---------- Fix D: lock new server-managed columns ----------
-- first_past_due_at + bank_fingerprint are set by the webhook + edge
-- functions, never by users. Extend the existing subscription RLS to
-- prevent client UPDATEs from forging them.
--
-- Subscriptions table already has narrow RLS (self-insert/update only
-- when status='incomplete' AND Stripe IDs are null — see migration 0013),
-- but past the incomplete state, no UPDATE should touch these columns.
-- Belt-and-suspenders via a trigger.
create or replace function enforce_subscription_field_ownership()
  returns trigger language plpgsql security definer as $$
declare
  caller_role text := current_setting('request.jwt.claim.role', true);
begin
  if caller_role = 'service_role' or auth.uid() is null then
    return new;
  end if;

  if new.first_past_due_at is distinct from old.first_past_due_at then
    raise exception 'subscriptions.first_past_due_at is managed server-side' using errcode = '42501';
  end if;
  if new.bank_fingerprint is distinct from old.bank_fingerprint then
    raise exception 'subscriptions.bank_fingerprint is managed server-side' using errcode = '42501';
  end if;
  if new.status is distinct from old.status then
    raise exception 'subscriptions.status is managed server-side' using errcode = '42501';
  end if;
  if new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_price_id is distinct from old.stripe_price_id
     or new.custom_fee_bps is distinct from old.custom_fee_bps
     or new.custom_monthly_price_id is distinct from old.custom_monthly_price_id then
    raise exception 'Stripe correlation fields are managed server-side' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists subscriptions_enforce_field_ownership on subscriptions;
create trigger subscriptions_enforce_field_ownership
  before update on subscriptions
  for each row execute function enforce_subscription_field_ownership();

notify pgrst, 'reload schema';
