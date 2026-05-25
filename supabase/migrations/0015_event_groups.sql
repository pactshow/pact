-- =====================================================================
-- Pact. — Folders ("Events" for promoters, "Tours" for artists)
--
-- Adds:
--   * event_groups   — owned by the profile that created them
--   * contracts.event_group_id — nullable FK; null means "ungrouped"
--
-- Folders are private to their creator. The contractor on a contract
-- doesn't see the promoter's folder name (RLS blocks reads); they see
-- the contract on its own. If both sides want to organize, they create
-- their own folders.
--
-- Pro feature: gated in the frontend. We don't add a DB-level Pro
-- check here — worst case, a non-Pro user could only ever insert a
-- folder via DevTools and they couldn't create contracts to put in it
-- anyway (the paywall trigger blocks). Frontend gate is sufficient.
-- =====================================================================

create table event_groups (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  name         text not null,
  venue        text,
  start_date   date,
  end_date     date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index event_groups_profile_id_idx on event_groups(profile_id);

create trigger event_groups_set_updated_at
  before update on event_groups
  for each row execute function set_updated_at();

alter table contracts
  add column event_group_id uuid references event_groups(id) on delete set null;

create index contracts_event_group_id_idx on contracts(event_group_id);

-- ---------- RLS — own-folder only --------------------------------------

alter table event_groups enable row level security;

create policy event_groups_select_own on event_groups
  for select to authenticated
  using (profile_id in (select id from profiles where user_id = auth.uid()));

create policy event_groups_insert_own on event_groups
  for insert to authenticated
  with check (profile_id in (select id from profiles where user_id = auth.uid()));

create policy event_groups_update_own on event_groups
  for update to authenticated
  using (profile_id in (select id from profiles where user_id = auth.uid()))
  with check (profile_id in (select id from profiles where user_id = auth.uid()));

create policy event_groups_delete_own on event_groups
  for delete to authenticated
  using (profile_id in (select id from profiles where user_id = auth.uid()));

notify pgrst, 'reload schema';
