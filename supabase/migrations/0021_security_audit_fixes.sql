-- =====================================================================
-- Pact. — Pre-launch security audit fixes (2026-05-26)
--
-- Closes four findings from the pre-mobile-port audit:
--   Vuln 1 (HIGH)  — profiles.is_admin self-promotion via UPDATE
--   Vuln 2 (HIGH)  — payments status/charge/transfer tampering by participants
--   Vuln 3 (HIGH)  — contractor_profile_id swap = payout redirect
--   Vuln 6 (LOW)   — handle_new_user trusts client-supplied tos_accepted_at
--
-- Vulns 4 + 5 (HIGH/MEDIUM) are addressed outside SQL by deleting the
-- dead `createConnectOnboardingLink` and `createCheckoutSession` edge fns.
-- =====================================================================


-- ---------- Vuln 1: Lock profiles.is_admin (+ user_id, +stripe_connect_account_id)
-- A non-service-role caller (i.e. anyone holding a normal user JWT) must
-- not be able to flip is_admin on themselves or anyone else, nor reassign
-- user_id, nor swap stripe_connect_account_id (which would point the
-- payout cron at a different Stripe Connect account).
create or replace function enforce_profile_field_ownership()
  returns trigger language plpgsql security definer as $$
declare
  caller_role text := current_setting('request.jwt.claim.role', true);
begin
  -- service_role bypass (cron, webhook, edge functions doing privileged work)
  if caller_role = 'service_role' or auth.uid() is null then
    return new;
  end if;

  if new.is_admin is distinct from old.is_admin then
    raise exception 'is_admin is managed server-side' using errcode = '42501';
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'user_id is immutable' using errcode = '42501';
  end if;

  if new.stripe_connect_account_id is distinct from old.stripe_connect_account_id then
    raise exception 'stripe_connect_account_id is managed server-side' using errcode = '42501';
  end if;

  if new.stripe_onboarding_complete is distinct from old.stripe_onboarding_complete then
    raise exception 'stripe_onboarding_complete is managed server-side' using errcode = '42501';
  end if;

  -- ToS acceptance is one-shot at signup via raw_user_meta_data; users
  -- cannot rewrite their own consent record.
  if new.tos_accepted_at is distinct from old.tos_accepted_at
     or new.tos_version is distinct from old.tos_version then
    raise exception 'ToS acceptance fields are managed server-side' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_field_ownership on profiles;
create trigger profiles_enforce_field_ownership
  before update on profiles
  for each row execute function enforce_profile_field_ownership();


-- ---------- Vuln 2: Lock payment status / Stripe correlation fields
-- A contract participant has UPDATE on payments (notes etc.), but must
-- not be able to forge status='paid', null-out stripe_transfer_id to
-- skip the cron, claim a refund that didn't happen, or rewrite the
-- charge amount after a PaymentIntent has been created.
create or replace function enforce_payment_field_ownership()
  returns trigger language plpgsql security definer as $$
declare
  caller_role text := current_setting('request.jwt.claim.role', true);
begin
  if caller_role = 'service_role' or auth.uid() is null then
    return new;
  end if;

  if new.status is distinct from old.status then
    raise exception 'payments.status is managed server-side' using errcode = '42501';
  end if;
  if new.stripe_charge_id is distinct from old.stripe_charge_id
     or new.stripe_transfer_id is distinct from old.stripe_transfer_id
     or new.stripe_payment_intent_id is distinct from old.stripe_payment_intent_id
     or new.stripe_checkout_session_id is distinct from old.stripe_checkout_session_id then
    raise exception 'Stripe correlation fields are managed server-side' using errcode = '42501';
  end if;
  if new.refunded_amount_cents is distinct from old.refunded_amount_cents
     or new.refund_after_transfer_alert is distinct from old.refund_after_transfer_alert then
    raise exception 'refund fields are managed server-side' using errcode = '42501';
  end if;
  if new.paid_date is distinct from old.paid_date
     or new.transfer_initiated_at is distinct from old.transfer_initiated_at then
    raise exception 'paid_date / transfer_initiated_at are managed server-side' using errcode = '42501';
  end if;

  -- Once a PaymentIntent exists, the contract participants cannot rewrite
  -- the amount — that's the authoritative gross we charged on Stripe.
  if old.stripe_payment_intent_id is not null
     and new.amount is distinct from old.amount then
    raise exception 'cannot change amount after PaymentIntent created' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists payments_enforce_field_ownership on payments;
create trigger payments_enforce_field_ownership
  before update on payments
  for each row execute function enforce_payment_field_ownership();


-- ---------- Vuln 3: Lock contract participants + money fields post-draft
-- Migration 0009 already locks signature/dispute/server-managed fields,
-- but did NOT touch contractor_profile_id / client_profile_id / created_by
-- / total_amount / deposit_amount / fee_payer / performance_date. A
-- malicious client can change contractor_profile_id after signing and
-- the dispute-window cron will then transfer to the new contractor's
-- Connect account. Lock these once the contract leaves 'draft'.
create or replace function enforce_contract_immutable_fields()
  returns trigger language plpgsql security definer as $$
declare
  caller_role text := current_setting('request.jwt.claim.role', true);
begin
  if caller_role = 'service_role' or auth.uid() is null then
    return new;
  end if;

  -- Drafts are still editable. Once status moves past draft (sent /
  -- pending_signatures / partially_signed / fully_signed / paid / etc.),
  -- these fields become immutable.
  if old.status = 'draft' then
    return new;
  end if;

  if new.contractor_profile_id is distinct from old.contractor_profile_id
     or new.client_profile_id is distinct from old.client_profile_id
     or new.created_by is distinct from old.created_by then
    raise exception 'contract participants cannot be changed after signing begins'
      using errcode = '42501';
  end if;

  if new.total_amount is distinct from old.total_amount
     or new.deposit_amount is distinct from old.deposit_amount
     or new.fee_payer is distinct from old.fee_payer
     or new.performance_date is distinct from old.performance_date
     or new.performance_end_date is distinct from old.performance_end_date
     or new.performance_time is distinct from old.performance_time then
    raise exception 'contract money / date / fee_payer fields cannot be changed after signing begins'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists contracts_enforce_immutable_fields on contracts;
-- Name starts with 'b' so it runs before 'contracts_enforce_field_ownership'
-- (alphabetical), keeping ordering deterministic with other triggers.
create trigger b_contracts_enforce_immutable_fields
  before update on contracts
  for each row execute function enforce_contract_immutable_fields();


-- ---------- Vuln 6: Server-stamp tos_accepted_at; don't trust client value
-- handle_new_user previously copied the client-supplied tos_accepted_at
-- string from raw_user_meta_data, which a malicious signup could forge or
-- omit. Stamp now() server-side whenever a non-empty tos_version is sent.
create or replace function handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_tos_version text := nullif(new.raw_user_meta_data->>'tos_version', '');
begin
  insert into public.profiles (user_id, name, email, tos_accepted_at, tos_version)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Unnamed'),
    new.email,
    case when v_tos_version is not null then now() else null end,
    v_tos_version
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
