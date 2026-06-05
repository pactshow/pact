-- =====================================================================
-- Pact. — Lock down stripe_webhook_events from the anon role
--
-- 0009 created this table with RLS explicitly DISABLED, on the (wrong)
-- assumption that "never read from the frontend" meant no exposure.
-- Supabase grants SELECT/INSERT/UPDATE/DELETE on every public-schema
-- table to the anon + authenticated roles by default — with RLS off,
-- those grants apply unrestricted.
--
-- The attack: anyone holding the (public) anon key can
--   1. SELECT and dump the full webhook event log (minor info leak), or
--   2. INSERT a row with a stripe_event_id that Stripe is about to send.
--      When the real event arrives, the dedup INSERT conflicts and the
--      handler skips — silently suppressing future webhook processing.
--      (e.g. suppress a refund / mark-as-paid / subscription-canceled
--      event with knowledge of how Stripe IDs are formed.)
--
-- Fix: enable RLS, ship zero policies. Only service_role (webhook,
-- cron, edge functions) bypasses RLS — exactly what we want.
-- =====================================================================

alter table stripe_webhook_events enable row level security;

-- No policies. With RLS on + no policies, authenticated + anon roles
-- get rejected on every operation. service_role bypasses RLS entirely.

notify pgrst, 'reload schema';
