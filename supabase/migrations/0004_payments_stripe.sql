-- =====================================================================
-- Pact. — Stripe payment fields on payments
--
-- Phase 4b: actual money movement via Stripe Connect (separate charges
-- and transfers). Venue pays via Checkout → funds land on platform
-- balance → after dispute window closes, transfer to contractor's
-- connected Express account.
-- =====================================================================

-- ---------- 1. Add Stripe identifiers to payments ------------------------

alter table payments
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_charge_id          text,
  add column if not exists stripe_transfer_id        text,
  add column if not exists transfer_initiated_at     timestamptz;

-- New payment_method values for Stripe-routed flows.
alter type payment_method add value if not exists 'stripe_card';
alter type payment_method add value if not exists 'stripe_transfer';

-- Each Stripe Checkout Session and Transfer is unique; enforce that no
-- two payment rows can claim the same one. Charges and PaymentIntents
-- are also unique but we already trust Stripe to enforce that upstream.
create unique index if not exists payments_checkout_session_unique
  on payments(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists payments_transfer_unique
  on payments(stripe_transfer_id)
  where stripe_transfer_id is not null;

-- ---------- 2. Index for the daily transfer job -------------------------

-- Job query: signed contracts past dispute window, charge captured,
-- transfer not yet sent. This index covers the "ready to transfer"
-- subset without scanning the whole table.
create index if not exists payments_ready_for_transfer_idx
  on payments(contract_id)
  where stripe_charge_id is not null
    and stripe_transfer_id is null;
