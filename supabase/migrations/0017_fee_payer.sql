-- =====================================================================
-- Pact. — Per-contract fee payer
--
-- Lets the contract creator dictate who pays Pact's 2% transaction fee:
--   * contractor (default, matches existing behavior — fee deducted
--     from the contractor's transfer at cron time)
--   * client (charged at PaymentIntent time — client pays amount + fee,
--     contractor receives the full contract amount net of nothing)
--   * split (50/50; ceil half added to client charge, floor half
--     deducted from contractor transfer — total to Pact == fee, with
--     odd-cent rounding favoring the client side, i.e. contractor's
--     deduction floors and client's add-on ceils)
--
-- Existing rows default to 'contractor' so in-flight contracts keep
-- their current economics. Application layer locks fee_payer once the
-- contract leaves draft (enforced in ContractForm + ownership trigger
-- considers it server-managed after signing).
-- =====================================================================

create type fee_payer as enum ('contractor', 'client', 'split');

alter table contracts
  add column if not exists fee_payer fee_payer not null default 'contractor';

notify pgrst, 'reload schema';
