-- 0020_tos_acceptance.sql
-- Captures Terms of Service consent at signup.
-- Adds tos_accepted_at + tos_version to profiles and updates handle_new_user
-- to copy those values from auth.users.raw_user_meta_data (set by the signup form).

alter table profiles
  add column if not exists tos_accepted_at timestamptz,
  add column if not exists tos_version text;

create or replace function handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.profiles (user_id, name, email, tos_accepted_at, tos_version)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Unnamed'),
    new.email,
    nullif(new.raw_user_meta_data->>'tos_accepted_at', '')::timestamptz,
    nullif(new.raw_user_meta_data->>'tos_version', '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
