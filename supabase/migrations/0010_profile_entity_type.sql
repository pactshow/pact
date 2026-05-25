-- =====================================================================
-- Pact. — Business vs individual payout entities
--
-- A contractor may receive payouts as themselves (individual / sole
-- proprietor) or as their LLC / S-Corp / etc. When 'business', Stripe
-- needs the legal entity name and EIN — we collect the name here and
-- defer the rest to Stripe's onboarding.
-- =====================================================================

create type profile_entity_type as enum ('individual', 'business');

alter table profiles
  add column if not exists entity_type profile_entity_type not null default 'individual',
  add column if not exists business_name text;
