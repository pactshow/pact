-- =====================================================================
-- Pact. — Pro tier custom clauses
--
-- Lets Pro users build their own private clause library alongside the
-- admin-curated globals. Globals stay `profile_id is null`; user-owned
-- clauses set profile_id to the owner.
--
-- RLS rules:
--   * SELECT: any authenticated user sees active globals + their own
--     clauses (active or not). Other users' clauses are invisible.
--   * INSERT: admins on globals; users on their own row only.
--   * UPDATE / DELETE: same ownership boundary.
--
-- Pro gating is enforced in the frontend (the management UI lives behind
-- `useSubscriptionAccess().isPro`). A non-Pro user determined enough to
-- hit PostgREST directly could still write rows visible only to them —
-- harmless, since nobody else sees them.
-- =====================================================================

alter table clause_library
  add column if not exists profile_id uuid references profiles(id) on delete cascade;

create index if not exists clause_library_profile_id_idx on clause_library(profile_id);

-- Replace whatever policies exist (table was bootstrapped via SQL editor,
-- so we don't know the exact names). Sweep them, then recreate.
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies where tablename = 'clause_library'
  loop
    execute format('drop policy if exists %I on clause_library', pol.policyname);
  end loop;
end $$;

alter table clause_library enable row level security;

create policy clause_library_select on clause_library
  for select to authenticated
  using (
    (profile_id is null and is_active = true)
    or profile_id in (select id from profiles where user_id = auth.uid())
  );

create policy clause_library_insert on clause_library
  for insert to authenticated
  with check (
    (profile_id is null
      and exists (
        select 1 from profiles where user_id = auth.uid() and is_admin = true
      ))
    or
    profile_id in (select id from profiles where user_id = auth.uid())
  );

create policy clause_library_update on clause_library
  for update to authenticated
  using (
    (profile_id is null
      and exists (
        select 1 from profiles where user_id = auth.uid() and is_admin = true
      ))
    or
    profile_id in (select id from profiles where user_id = auth.uid())
  )
  with check (
    (profile_id is null
      and exists (
        select 1 from profiles where user_id = auth.uid() and is_admin = true
      ))
    or
    profile_id in (select id from profiles where user_id = auth.uid())
  );

create policy clause_library_delete on clause_library
  for delete to authenticated
  using (
    (profile_id is null
      and exists (
        select 1 from profiles where user_id = auth.uid() and is_admin = true
      ))
    or
    profile_id in (select id from profiles where user_id = auth.uid())
  );

notify pgrst, 'reload schema';
