-- =====================================================================
-- Pact. — initial schema
-- Run this once in the Supabase SQL editor.
--
-- Design notes:
--  * Each user (auth.users) can own multiple profiles (artist, venue, or both).
--  * Contracts reference an artist profile and a venue profile; either party
--    can read/update a contract they're a participant in.
--  * Sensitive payment + tax info (bank, SSN, EIN, W9) is NOT stored here.
--    Stripe Connect holds it; we store only a connect_account_id.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- enum types ----------------------------------------------------

create type profile_type as enum ('artist', 'venue');

create type contract_status as enum (
  'draft', 'sent', 'received', 'signed', 'completed', 'cancelled', 'countered'
);

create type payment_type as enum (
  'deposit', 'balance', 'full_payment', 'bonus', 'other'
);

create type payment_status as enum ('pending', 'paid', 'overdue', 'cancelled');

create type payment_method as enum (
  'bank_transfer', 'check', 'cash', 'paypal', 'venmo', 'stripe_ach', 'other'
);

create type connection_status as enum ('pending', 'accepted', 'declined');

create type notification_type as enum (
  'contract_received', 'contract_signed', 'contract_cancelled',
  'dispute_filed', 'dispute_window_closed',
  'ach_initiated', 'payment_received', 'signature_added',
  'connection_request', 'connection_accepted'
);

-- ---------- updated_at trigger helper -------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles ------------------------------------------------------

create table profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  type            profile_type not null,
  name            text not null,
  email           text not null,
  phone           text,
  address         text,
  city            text,
  state           text,
  zip_code        text,
  website         text,
  genre           text,         -- artist
  capacity        integer,      -- venue
  bio             text,
  image_url       text,
  standard_rate   numeric(10,2),
  tax_id_last4    text,         -- display-only, last 4 of SSN/EIN
  -- Stripe Connect (artists receive payouts; venues pay):
  stripe_customer_id            text,  -- for venues paying out
  stripe_connect_account_id     text,  -- for artists receiving
  stripe_onboarding_complete    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index profiles_user_id_idx on profiles(user_id);
create index profiles_type_idx on profiles(type);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------- contracts -----------------------------------------------------

create table contracts (
  id                  uuid primary key default gen_random_uuid(),
  created_by          uuid not null references auth.users(id) on delete set null,
  title               text not null,

  artist_profile_id   uuid references profiles(id) on delete set null,
  venue_profile_id    uuid references profiles(id) on delete set null,

  -- denormalized snapshots so the contract reads correctly even if a profile
  -- is later renamed or deleted:
  artist_name         text not null,
  artist_email        text,
  venue_name          text not null,
  venue_email         text,
  venue_address       text,

  performance_date    date not null,
  load_in_time        text,
  performance_time    text,
  set_length          text,

  total_amount        numeric(10,2) not null,
  deposit_amount      numeric(10,2),
  deposit_due_date    date,
  balance_due_date    date,

  status              contract_status not null default 'draft',
  counter_offer_to    uuid references contracts(id) on delete set null,

  technical_requirements   text,
  hospitality_requirements text,
  additional_terms         text,
  contract_sections        jsonb not null default '[]'::jsonb,

  artist_signature        text,
  artist_signed_date      timestamptz,
  artist_signed_device    text,
  venue_signature         text,
  venue_signed_date       timestamptz,
  venue_signed_device     text,

  artist_disputed         boolean not null default false,
  artist_dispute_reason   text,
  artist_dispute_section  text,
  artist_dispute_date     timestamptz,
  venue_disputed          boolean not null default false,
  venue_dispute_reason    text,
  venue_dispute_section   text,
  venue_dispute_date      timestamptz,
  dispute_window_closes   timestamptz,

  ach_transfer_triggered  boolean not null default false,
  ach_transfer_date       timestamptz,
  pdf_url                 text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index contracts_created_by_idx       on contracts(created_by);
create index contracts_artist_profile_idx   on contracts(artist_profile_id);
create index contracts_venue_profile_idx    on contracts(venue_profile_id);
create index contracts_status_idx           on contracts(status);
create index contracts_performance_date_idx on contracts(performance_date);

create trigger contracts_set_updated_at
  before update on contracts
  for each row execute function set_updated_at();

-- ---------- payments ------------------------------------------------------

create table payments (
  id                       uuid primary key default gen_random_uuid(),
  contract_id              uuid not null references contracts(id) on delete cascade,
  type                     payment_type not null,
  amount                   numeric(10,2) not null,
  due_date                 date,
  paid_date                date,
  status                   payment_status not null default 'pending',
  method                   payment_method,
  reference_number         text,
  notes                    text,
  payer_name               text,
  payee_name               text,
  stripe_payment_intent_id text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index payments_contract_id_idx on payments(contract_id);
create index payments_status_idx      on payments(status);

create trigger payments_set_updated_at
  before update on payments
  for each row execute function set_updated_at();

-- ---------- connections ---------------------------------------------------

create table connections (
  id                    uuid primary key default gen_random_uuid(),
  requester_profile_id  uuid not null references profiles(id) on delete cascade,
  recipient_profile_id  uuid not null references profiles(id) on delete cascade,
  status                connection_status not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- prevent duplicate pending requests between the same two profiles:
  unique (requester_profile_id, recipient_profile_id)
);

create index connections_requester_idx on connections(requester_profile_id);
create index connections_recipient_idx on connections(recipient_profile_id);

create trigger connections_set_updated_at
  before update on connections
  for each row execute function set_updated_at();

-- ---------- notifications -------------------------------------------------

create table notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         notification_type not null,
  title        text not null,
  message      text not null,
  contract_id  uuid references contracts(id) on delete cascade,
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);

create index notifications_user_id_idx on notifications(user_id);
create index notifications_unread_idx  on notifications(user_id) where read = false;

-- =====================================================================
-- Row-Level Security
-- =====================================================================

-- Helper: returns the set of profile IDs owned by the current user.
create or replace function my_profile_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from profiles where user_id = auth.uid();
$$;

-- ---------- profiles RLS --------------------------------------------------
alter table profiles enable row level security;

-- Anyone authenticated can read profiles (needed for the Network/discovery feature).
create policy "profiles: read any authenticated"
  on profiles for select
  to authenticated
  using (true);

-- Only the owner can insert/update/delete their own profile.
create policy "profiles: owner inserts"
  on profiles for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "profiles: owner updates"
  on profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "profiles: owner deletes"
  on profiles for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------- contracts RLS -------------------------------------------------
alter table contracts enable row level security;

-- Read: creator OR a participant (owns one of the linked profiles).
create policy "contracts: participant reads"
  on contracts for select
  to authenticated
  using (
    created_by = auth.uid()
    or artist_profile_id in (select my_profile_ids())
    or venue_profile_id  in (select my_profile_ids())
  );

create policy "contracts: creator inserts"
  on contracts for insert
  to authenticated
  with check (created_by = auth.uid());

-- Update: creator OR a participant. (Application enforces field-level rules,
-- e.g. artist can only set artist_signature, etc.)
create policy "contracts: participant updates"
  on contracts for update
  to authenticated
  using (
    created_by = auth.uid()
    or artist_profile_id in (select my_profile_ids())
    or venue_profile_id  in (select my_profile_ids())
  );

create policy "contracts: creator deletes"
  on contracts for delete
  to authenticated
  using (created_by = auth.uid());

-- ---------- payments RLS --------------------------------------------------
alter table payments enable row level security;

-- A user can act on a payment iff they can read its parent contract.
create policy "payments: participant reads"
  on payments for select
  to authenticated
  using (
    exists (
      select 1 from contracts c
      where c.id = payments.contract_id
        and (
          c.created_by = auth.uid()
          or c.artist_profile_id in (select my_profile_ids())
          or c.venue_profile_id  in (select my_profile_ids())
        )
    )
  );

create policy "payments: participant inserts"
  on payments for insert
  to authenticated
  with check (
    exists (
      select 1 from contracts c
      where c.id = payments.contract_id
        and (
          c.created_by = auth.uid()
          or c.artist_profile_id in (select my_profile_ids())
          or c.venue_profile_id  in (select my_profile_ids())
        )
    )
  );

create policy "payments: participant updates"
  on payments for update
  to authenticated
  using (
    exists (
      select 1 from contracts c
      where c.id = payments.contract_id
        and (
          c.created_by = auth.uid()
          or c.artist_profile_id in (select my_profile_ids())
          or c.venue_profile_id  in (select my_profile_ids())
        )
    )
  );

-- ---------- connections RLS -----------------------------------------------
alter table connections enable row level security;

-- Either party in the connection can read it.
create policy "connections: party reads"
  on connections for select
  to authenticated
  using (
    requester_profile_id in (select my_profile_ids())
    or recipient_profile_id in (select my_profile_ids())
  );

-- Only the requester (owner of requester_profile) can create.
create policy "connections: requester inserts"
  on connections for insert
  to authenticated
  with check (requester_profile_id in (select my_profile_ids()));

-- Either party can update (e.g. recipient accepts/declines).
create policy "connections: party updates"
  on connections for update
  to authenticated
  using (
    requester_profile_id in (select my_profile_ids())
    or recipient_profile_id in (select my_profile_ids())
  );

-- ---------- notifications RLS ---------------------------------------------
alter table notifications enable row level security;

create policy "notifications: owner reads"
  on notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications: owner updates"
  on notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Inserts come from server (service_role bypasses RLS) — no user-facing insert policy.
