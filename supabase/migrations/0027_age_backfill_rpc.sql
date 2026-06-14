-- =====================================================================
-- Pact. — Server-validated DOB backfill for existing users
--
-- 0026 made DOB mandatory for new signups. Existing users still have
-- profiles.date_of_birth = null. The app forces a one-time prompt
-- through AgeGate.jsx on next login; this RPC backs that prompt.
--
-- Why an RPC instead of a direct UPDATE through RLS:
--   * Age check must run server-side so a tampered client can't
--     submit a DOB <18 and bypass the gate.
--   * DOB is immutable once set. The RPC refuses if the row already
--     has a value — prevents silent "edit my age" attacks.
-- =====================================================================

create or replace function confirm_date_of_birth(dob date)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_existing date;
  v_rows int;
begin
  if v_uid is null then
    raise exception 'must be authenticated' using errcode = '42501';
  end if;

  if dob is null then
    raise exception 'date_of_birth is required' using errcode = '23502';
  end if;

  if dob < '1900-01-01'::date or dob > current_date then
    raise exception 'date_of_birth is invalid' using errcode = '22023';
  end if;

  if dob > current_date - interval '18 years' then
    raise exception 'You must be 18 or older to use Pact.' using errcode = '22023';
  end if;

  select date_of_birth into v_existing
  from profiles
  where user_id = v_uid
  limit 1;

  if v_existing is not null then
    raise exception 'date_of_birth has already been set' using errcode = '23505';
  end if;

  update profiles
  set date_of_birth = dob,
      updated_at = now()
  where user_id = v_uid
    and date_of_birth is null;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'no profile found for current user' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function confirm_date_of_birth(date) from public;
grant execute on function confirm_date_of_birth(date) to authenticated;

notify pgrst, 'reload schema';
