-- =====================================================================
-- Pact. — Age verification at signup (18+)
--
-- Decision (2026-06-10): Pact is 18+ only. Minors lack legal capacity
-- to enter into the performance contracts the platform generates, and
-- the standard indemnification/liability template assumes adult
-- counterparties on both sides.
--
-- This migration:
--   1. Adds nullable profiles.date_of_birth. New signups will always
--      populate it via the updated trigger; existing rows stay null
--      until we ship the in-app backfill prompt.
--   2. Updates handle_new_user to require DOB in raw_user_meta_data
--      and to reject anyone under 18 at signup time. Server-side
--      enforcement so a bad actor can't bypass the client check.
-- =====================================================================

alter table profiles
  add column if not exists date_of_birth date;

comment on column profiles.date_of_birth is
  '18+ gate: validated server-side in handle_new_user at signup. Nullable for legacy rows that pre-date 0026.';

create or replace function handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_tos_version text := nullif(new.raw_user_meta_data->>'tos_version', '');
  v_username    text := nullif(lower(new.raw_user_meta_data->>'username'), '');
  v_dob_text    text := nullif(new.raw_user_meta_data->>'date_of_birth', '');
  v_dob         date;
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

  if v_dob_text is null then
    raise exception 'date_of_birth is required at signup' using errcode = '23502';
  end if;

  begin
    v_dob := v_dob_text::date;
  exception when others then
    raise exception 'date_of_birth must be a valid date (YYYY-MM-DD)' using errcode = '22023';
  end;

  if v_dob < '1900-01-01'::date or v_dob > current_date then
    raise exception 'date_of_birth is invalid' using errcode = '22023';
  end if;

  if v_dob > current_date - interval '18 years' then
    raise exception 'You must be 18 or older to use Pact.' using errcode = '22023';
  end if;

  insert into public.profiles (
    user_id, name, email, tos_accepted_at, tos_version, username, date_of_birth
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Unnamed'),
    new.email,
    now(),
    v_tos_version,
    v_username,
    v_dob
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

notify pgrst, 'reload schema';
