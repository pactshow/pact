-- =====================================================================
-- Pact. — Multi-day performance support
--
-- Adds an optional end date so a single contract can cover a multi-night
-- residency or run. When null, the gig is single-day (today's behavior).
-- The single performance_time applies to every night.
--
-- Dispute window calculation uses end date when set, so the window opens
-- after the artist has played all scheduled nights.
-- =====================================================================

alter table contracts
  add column if not exists performance_end_date date;
