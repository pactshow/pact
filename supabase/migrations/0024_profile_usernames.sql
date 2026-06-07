-- =====================================================================
-- Pact. — Profile usernames (optional, nullable)
--
-- Adds @-handles for profiles so the Network page can search by handle,
-- and contracts can reference "@preston" instead of "Preston Milton".
--
-- Format: 3-20 chars of lowercase letters, digits, underscore.
-- Unique when set (partial unique index — null slots are non-conflicting).
-- =====================================================================

alter table profiles
  add column if not exists username text;

alter table profiles
  drop constraint if exists profiles_username_format;

alter table profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');

create unique index if not exists profiles_username_unique_ci
  on profiles (lower(username))
  where username is not null;

-- handle_new_user now also captures the username from raw_user_meta_data
-- when supplied. Optional — if not present, profile is created without
-- one and the user can set it later from the Profile page. Same ToS
-- guard as 0021.
create or replace function handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_tos_version text := nullif(new.raw_user_meta_data->>'tos_version', '');
  v_username    text := nullif(lower(new.raw_user_meta_data->>'username'), '');
begin
  if v_tos_version is null then
    raise exception 'tos_version is required at signup' using errcode = '42501';
  end if;

  -- Validate username if supplied. If it fails format, surface a clear
  -- error rather than letting the CHECK constraint reject after insert.
  if v_username is not null and v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'username must be 3-20 chars of lowercase letters, digits, or underscore'
      using errcode = '22023';
  end if;

  insert into public.profiles (user_id, name, email, tos_accepted_at, tos_version, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Unnamed'),
    new.email,
    now(),
    v_tos_version,
    v_username
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

notify pgrst, 'reload schema';
