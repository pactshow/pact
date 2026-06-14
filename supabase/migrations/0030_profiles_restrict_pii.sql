-- Tighten profiles SELECT so PII does not leak across users.
--
-- The original "read any authenticated" policy on profiles used
-- `using (true)`, which let any signed-in user dump every other user's
-- full row — email, phone, address, zip_code, tax_id_last4, stripe_*
-- ids, date_of_birth. This migration replaces it with two narrower row
-- policies plus a column-restricted view:
--
--   1. profiles: read own
--        — self can read their own row in full (settings/billing UI).
--   2. profiles: read accepted-connection counterparty
--        — once two users have an accepted Connection, each may read the
--          other's full row. Required by the contract-form "Pick from
--          Network" autofill (NetworkProfilePicker), which populates
--          contractor_email / client_address etc. from a connection.
--   3. public_profiles VIEW
--        — non-PII subset (name, username, image, bio, city, state,
--          website, user_side, standard_rate, business_name,
--          entity_type) for the Network discovery feature. Created in
--          definer mode so it can return rows across users; safety
--          comes from the column list.
--
-- Existing signed contracts are unaffected: counterparty contact info
-- is denormalized onto the contracts row at signing time.

drop policy if exists "profiles: read any authenticated" on profiles;

create policy "profiles: read own"
  on profiles for select
  to authenticated
  using (user_id = auth.uid());

create policy "profiles: read accepted-connection counterparty"
  on profiles for select
  to authenticated
  using (
    id in (
      select c.recipient_profile_id
        from connections c
        where c.status = 'accepted'
          and c.requester_profile_id in (select my_profile_ids())
      union
      select c.requester_profile_id
        from connections c
        where c.status = 'accepted'
          and c.recipient_profile_id in (select my_profile_ids())
    )
  );

create or replace view public_profiles
with (security_invoker = false) as
select
  id,
  user_id,
  name,
  username,
  image_url,
  bio,
  city,
  state,
  website,
  user_side,
  standard_rate,
  business_name,
  entity_type,
  created_at
from profiles;

comment on view public_profiles is
  'Discovery-safe subset of profiles. PII (email, phone, address, zip_code, tax_id_last4, stripe_*, date_of_birth, tos_*) is intentionally omitted. Use this view for Network search and any list-of-users UI; use the profiles table only for self or for counterparties with an accepted connection.';

revoke all on public_profiles from public, anon;
grant select on public_profiles to authenticated;
