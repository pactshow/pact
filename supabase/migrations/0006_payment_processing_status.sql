-- =====================================================================
-- Pact. — Add 'processing' state to payment_status
--
-- Phase 4d: ACH payments. ACH takes 3–5 business days to clear, so we
-- need an intermediate state between 'pending' (no checkout started)
-- and 'paid' (funds actually settled).
--
-- State machine:
--   pending    → user has not initiated payment
--   processing → ACH initiated, waiting for clearance
--   paid       → funds settled on platform balance
--   cancelled  → ACH failed (insufficient funds, account closed, etc.)
-- =====================================================================

alter type payment_status add value if not exists 'processing';
