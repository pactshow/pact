-- =====================================================================
-- Pact. — Subscriptions + user side (artist vs promoter)
--
-- Adds:
--   * profiles.user_side enum — set during onboarding, decides which
--     pricing tiers the user sees and which side of the marketplace
--     they primarily play on.
--   * subscriptions table — one row per profile. Stripe webhook owns
--     mutations to active rows; users may insert/update only their own
--     'incomplete' row during onboarding (pre-Stripe-customer state).
--
-- Rationale: we keep user_side on profiles (single value, set once) and
-- tier on subscriptions (changes when the user upgrades / downgrades).
-- =====================================================================

-- ---------- 1. user_side enum + column on profiles -------------------
create type user_side as enum ('artist', 'promoter');

alter table profiles
  add column if not exists user_side user_side;

create index if not exists profiles_user_side_idx on profiles(user_side);

-- ---------- 2. Subscription enums ------------------------------------
create type subscription_tier as enum (
  'artist_basic',
  'artist_pro',
  'promoter_basic',
  'promoter_pro'
);

-- Mirrors Stripe's Subscription.status values we care about.
create type subscription_status as enum (
  'incomplete',           -- created locally, no Stripe subscription yet
  'incomplete_expired',
  'trialing',             -- in 30-day free trial
  'active',
  'past_due',
  'canceled',
  'unpaid'
);

-- ---------- 3. Subscriptions table -----------------------------------
create table subscriptions (
  id                          uuid primary key default gen_random_uuid(),
  profile_id                  uuid not null unique
                              references profiles(id) on delete cascade,
  tier                        subscription_tier not null,
  status                      subscription_status not null default 'incomplete',
  stripe_customer_id          text,
  stripe_subscription_id      text unique,
  stripe_payment_method_id    text,    -- the linked us_bank_account
  trial_ends_at               timestamptz,
  current_period_end          timestamptz,
  cancel_at_period_end        boolean not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index subscriptions_profile_id_idx on subscriptions(profile_id);
create index subscriptions_status_idx on subscriptions(status);

create trigger subscriptions_set_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

-- ---------- 4. RLS — read-own + limited self-insert in onboarding ----
alter table subscriptions enable row level security;

-- Helper: does this profile_id belong to the current auth.uid()?
-- (Inlined in policies to avoid a separate sql function dependency.)

create policy subscriptions_select_own on subscriptions
  for select to authenticated
  using (
    profile_id in (select id from profiles where user_id = auth.uid())
  );

-- Onboarding: user creates their own row in 'incomplete' state, no
-- Stripe IDs yet. The Phase 2 edge function (running as service_role)
-- promotes it to 'trialing'/'active' once Stripe is set up.
create policy subscriptions_insert_own_incomplete on subscriptions
  for insert to authenticated
  with check (
    profile_id in (select id from profiles where user_id = auth.uid())
    and status = 'incomplete'
    and stripe_subscription_id is null
    and stripe_customer_id is null
  );

-- Onboarding: user can change tier on their own incomplete row only.
-- Once Stripe takes over, status flips out of 'incomplete' and this
-- policy stops applying — only service_role can update from then on.
create policy subscriptions_update_own_incomplete on subscriptions
  for update to authenticated
  using (
    profile_id in (select id from profiles where user_id = auth.uid())
    and status = 'incomplete'
  )
  with check (
    profile_id in (select id from profiles where user_id = auth.uid())
    and status = 'incomplete'
    and stripe_subscription_id is null
    and stripe_customer_id is null
  );

-- No DELETE policy = user can't delete; service_role bypasses RLS.
