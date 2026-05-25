-- =====================================================================
-- Pact. — Per-clause customizable variables
--
-- Clause content supports {{variable_key}} placeholders. The admin
-- defines what variables a clause exposes; the contract builder lets
-- the user override defaults when adding the clause to a contract.
--
-- variables shape:
--   [{ "key": "late_fee_percent", "label": "Late fee per week (%)",
--      "default": "5", "type": "number", "suffix": "%" }, ...]
--
-- Resolved (substituted) text is snapshotted onto the contract row so
-- signed contracts never drift.
-- =====================================================================

alter table clause_library
  add column if not exists variables jsonb not null default '[]'::jsonb;
