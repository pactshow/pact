-- =====================================================================
-- Pact. — Make profile usernames required
--
-- 0024 added username as optional/nullable. Decision (2026-06-07):
-- usernames are now mandatory at signup. This migration:
--   1. Backfills any existing null usernames with a placeholder
--      `user_<first 8 of user_id>` so the NOT NULL flip doesn't reject.
--      Affected users can change theirs from the Profile page.
--   2. Adds NOT NULL constraint to profiles.username.
--   3. Updates handle_new_user to raise if no username supplied.
-- =====================================================================

-- 1. Backfill nulls. Placeholder format always satisfies the 0024
--    format CHECK ([a-z0-9_]{3,20}) — `user_` (5) + 8 hex chars (8) = 13.
update profiles
set username = 'user_' || substring(replace(user_id::text, '-', '') from 1 for 8)
where username is null;

-- Edge case: two profiles whose user_id share the same first 8 hex chars
-- would collide on the unique index. Vanishingly unlikely (8 hex = 4B
-- space), but if it happens the second one falls back to first 16.
update profiles p1
set username = 'user_' || substring(replace(user_id::text, '-', '') from 1 for 16)
where exists (
  select 1 from profiles p2
  where p2.id <> p1.id and lower(p2.username) = lower(p1.username)
);

-- 2. Lock it in.
alter table profiles
  alter column username set not null;

-- 3. handle_new_user now requires username in raw_user_meta_data.
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

  if v_username is null then
    raise exception 'username is required at signup' using errcode = '23502';
  end if;

  if v_username !~ '^[a-z0-9_]{3,20}$' then
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
