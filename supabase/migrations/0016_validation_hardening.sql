-- =====================================================================
-- Pact. — Pre-launch validation + security hardening
--
-- Locks down the data layer with constraints the application *should*
-- be enforcing and DB *was* trusting. Pre-launch posture: assume zero
-- existing live data; CHECK constraints are added without `not valid`.
-- If a test row violates one, clean the row and re-run.
--
-- Covers fixes from the audit: negative amounts, deposit > total,
-- date ordering, time format, percentage range, length caps, email/url
-- format, dedup of in-flight PaymentIntents, partial-refund accounting,
-- post-transfer refund alerting.
-- =====================================================================

-- ---------- 1. Payments: dedup in-flight PaymentIntents --------------
-- Belt with the new Stripe idempotency-key suspenders in
-- createPaymentIntent: a concurrent double-click can no longer leave
-- two distinct PaymentIntents both stuck on the same payment row.
create unique index if not exists payments_payment_intent_unique
  on payments(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- ---------- 2. Payments: refund accounting ---------------------------
-- Replaces the pattern of regressing status='paid' to 'pending' on a
-- partial refund (which silently stranded contractor payouts). We now
-- track the refunded amount on the row; the cron deducts it before
-- transferring net-of-fee.
alter table payments
  add column if not exists refunded_amount_cents integer not null default 0,
  add column if not exists refund_after_transfer_alert boolean not null default false;

-- Tripped by the webhook when a refund arrives AFTER funds have already
-- been transferred to the contractor's Connect account. There's no
-- automatic recovery path; flag for manual reconciliation.
create index if not exists payments_refund_alert_idx
  on payments(refund_after_transfer_alert)
  where refund_after_transfer_alert = true;

-- ---------- 3. Payments: amount sanity -------------------------------
alter table payments
  drop constraint if exists payments_amount_positive,
  drop constraint if exists payments_refund_bounds;

alter table payments
  add constraint payments_amount_positive
    check (amount is null or amount > 0),
  add constraint payments_refund_bounds
    check (refunded_amount_cents >= 0);

-- ---------- 4. Contracts: amount + date sanity -----------------------
alter table contracts
  drop constraint if exists contracts_total_amount_positive,
  drop constraint if exists contracts_deposit_amount_nonneg,
  drop constraint if exists contracts_deposit_le_total,
  drop constraint if exists contracts_perf_dates_ordered,
  drop constraint if exists contracts_deposit_due_le_perf,
  drop constraint if exists contracts_balance_due_ge_deposit_due,
  drop constraint if exists contracts_perf_time_format,
  drop constraint if exists contracts_load_in_time_format,
  drop constraint if exists contracts_title_length,
  drop constraint if exists contracts_additional_terms_length,
  drop constraint if exists contracts_tech_req_length,
  drop constraint if exists contracts_hosp_req_length,
  drop constraint if exists contracts_contractor_email_format,
  drop constraint if exists contracts_client_email_format;

alter table contracts
  add constraint contracts_total_amount_positive
    check (total_amount is null or total_amount > 0),
  add constraint contracts_deposit_amount_nonneg
    check (deposit_amount is null or deposit_amount >= 0),
  add constraint contracts_deposit_le_total
    check (
      deposit_amount is null or total_amount is null
      or deposit_amount <= total_amount
    ),
  add constraint contracts_perf_dates_ordered
    check (
      performance_end_date is null or performance_date is null
      or performance_end_date >= performance_date
    ),
  add constraint contracts_deposit_due_le_perf
    check (
      deposit_due_date is null or performance_date is null
      or deposit_due_date <= performance_date
    ),
  add constraint contracts_balance_due_ge_deposit_due
    check (
      balance_due_date is null or deposit_due_date is null
      or balance_due_date >= deposit_due_date
    ),
  -- HH:MM 24h, hours 00-23, minutes 00-59. Frontend enforces 15-min
  -- snap; DB just rejects nonsense like "25:99".
  add constraint contracts_perf_time_format
    check (
      performance_time is null or performance_time = '' or
      performance_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    ),
  add constraint contracts_load_in_time_format
    check (
      load_in_time is null or load_in_time = '' or
      load_in_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    ),
  add constraint contracts_title_length
    check (title is null or length(title) <= 200),
  add constraint contracts_additional_terms_length
    check (additional_terms is null or length(additional_terms) <= 20000),
  add constraint contracts_tech_req_length
    check (technical_requirements is null or length(technical_requirements) <= 10000),
  add constraint contracts_hosp_req_length
    check (hospitality_requirements is null or length(hospitality_requirements) <= 10000),
  -- Lenient email check — has @ and a dot somewhere after. Catches the
  -- worst nonsense without being a full RFC validator.
  add constraint contracts_contractor_email_format
    check (
      contractor_email is null or contractor_email = '' or
      contractor_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  add constraint contracts_client_email_format
    check (
      client_email is null or client_email = '' or
      client_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    );

-- ---------- 5. Contract templates: numeric ranges --------------------
alter table contract_templates
  drop constraint if exists templates_deposit_pct_range,
  drop constraint if exists templates_deposit_days_nonneg,
  drop constraint if exists templates_load_in_hours_range;

alter table contract_templates
  add constraint templates_deposit_pct_range
    check (
      deposit_percentage is null
      or (deposit_percentage >= 0 and deposit_percentage <= 100)
    ),
  add constraint templates_deposit_days_nonneg
    check (deposit_due_days_before is null or deposit_due_days_before >= 0),
  add constraint templates_load_in_hours_range
    check (
      load_in_hours_before is null
      or (load_in_hours_before >= 0 and load_in_hours_before <= 168)
    );

-- ---------- 6. Event groups: date ordering + length caps -------------
alter table event_groups
  drop constraint if exists event_groups_dates_ordered,
  drop constraint if exists event_groups_name_length,
  drop constraint if exists event_groups_venue_length,
  drop constraint if exists event_groups_notes_length;

alter table event_groups
  add constraint event_groups_dates_ordered
    check (
      end_date is null or start_date is null or end_date >= start_date
    ),
  add constraint event_groups_name_length
    check (length(name) >= 1 and length(name) <= 200),
  add constraint event_groups_venue_length
    check (venue is null or length(venue) <= 200),
  add constraint event_groups_notes_length
    check (notes is null or length(notes) <= 5000);

-- ---------- 7. Profiles: rate, length caps, email + url --------------
alter table profiles
  drop constraint if exists profiles_standard_rate_nonneg,
  drop constraint if exists profiles_name_length,
  drop constraint if exists profiles_bio_length,
  drop constraint if exists profiles_email_format,
  drop constraint if exists profiles_website_format;

alter table profiles
  add constraint profiles_standard_rate_nonneg
    check (standard_rate is null or standard_rate >= 0),
  add constraint profiles_name_length
    check (name is null or length(name) <= 200),
  add constraint profiles_bio_length
    check (bio is null or length(bio) <= 2000),
  add constraint profiles_email_format
    check (
      email is null or email = '' or
      email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  -- Reject javascript: / data: / file: / etc. URLs. Must start with
  -- http:// or https://. We never auto-link this field today, but
  -- this prevents future code from rendering it as an <a href> footgun.
  add constraint profiles_website_format
    check (
      website is null or website = '' or
      website ~* '^https?://'
    );

notify pgrst, 'reload schema';
