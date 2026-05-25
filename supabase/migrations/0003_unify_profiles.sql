-- =====================================================================
-- Pact. — unify profiles (remove artist/venue distinction)
--
-- Product decision: one user = one profile. Role (client vs contractor)
-- is defined per-contract, not on the profile. Same person can hire
-- others on one gig and be hired on another.
-- =====================================================================

-- ---------- 1. Drop the old notifications trigger (depends on old names) --

drop trigger if exists contracts_notifications on contracts;
drop function if exists handle_contract_notifications();
drop function if exists notify_contract_parties(contracts, notification_type, text, text);

-- ---------- 2. Drop role-specific profile columns ------------------------

alter table profiles drop column if exists type;
alter table profiles drop column if exists genre;
alter table profiles drop column if exists capacity;

drop type if exists profile_type;

-- ---------- 3. Deduplicate profiles (keep oldest per user) ---------------

delete from profiles p1
using profiles p2
where p1.user_id = p2.user_id
  and p1.created_at > p2.created_at;

-- ---------- 4. One profile per user -------------------------------------

alter table profiles add constraint profiles_user_id_unique unique (user_id);

-- ---------- 5. Rename contract fields: artist→contractor, venue→client --

alter table contracts rename column artist_profile_id      to contractor_profile_id;
alter table contracts rename column venue_profile_id       to client_profile_id;
alter table contracts rename column artist_name            to contractor_name;
alter table contracts rename column artist_email           to contractor_email;
alter table contracts rename column venue_name             to client_name;
alter table contracts rename column venue_email            to client_email;
alter table contracts rename column venue_address          to client_address;
alter table contracts rename column artist_signature       to contractor_signature;
alter table contracts rename column artist_signed_date     to contractor_signed_date;
alter table contracts rename column artist_signed_device   to contractor_signed_device;
alter table contracts rename column venue_signature        to client_signature;
alter table contracts rename column venue_signed_date      to client_signed_date;
alter table contracts rename column venue_signed_device    to client_signed_device;
alter table contracts rename column artist_disputed        to contractor_disputed;
alter table contracts rename column artist_dispute_reason  to contractor_dispute_reason;
alter table contracts rename column artist_dispute_section to contractor_dispute_section;
alter table contracts rename column artist_dispute_date    to contractor_dispute_date;
alter table contracts rename column venue_disputed         to client_disputed;
alter table contracts rename column venue_dispute_reason   to client_dispute_reason;
alter table contracts rename column venue_dispute_section  to client_dispute_section;
alter table contracts rename column venue_dispute_date     to client_dispute_date;

alter index contracts_artist_profile_idx rename to contracts_contractor_profile_idx;
alter index contracts_venue_profile_idx  rename to contracts_client_profile_idx;

-- ---------- 6. Auto-create profile on signup ----------------------------

create or replace function handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.profiles (user_id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Unnamed'),
    new.email
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- 7. Backfill: create profiles for existing auth users --------

insert into profiles (user_id, name, email)
select u.id,
       coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'Unnamed'),
       u.email
from auth.users u
where not exists (select 1 from profiles p where p.user_id = u.id);

-- ---------- 8. Rebuild notifications trigger with new field names -------

create or replace function notify_contract_parties(
  p_contract   contracts,
  p_type       notification_type,
  p_title      text,
  p_message    text
) returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  contractor_uid uuid;
  client_uid     uuid;
begin
  select user_id into contractor_uid from profiles where id = p_contract.contractor_profile_id;
  select user_id into client_uid     from profiles where id = p_contract.client_profile_id;

  if contractor_uid is not null then
    insert into notifications (user_id, type, title, message, contract_id)
    values (contractor_uid, p_type, p_title, p_message, p_contract.id);
  end if;

  if client_uid is not null and client_uid is distinct from contractor_uid then
    insert into notifications (user_id, type, title, message, contract_id)
    values (client_uid, p_type, p_title, p_message, p_contract.id);
  end if;
end;
$$;

create or replace function handle_contract_notifications()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.status = 'sent' then
      perform notify_contract_parties(
        NEW, 'contract_received', 'Contract Received',
        format('A new contract "%s" has been sent by %s to %s.',
               NEW.title, NEW.client_name, NEW.contractor_name));
    end if;
    return NEW;
  end if;

  if NEW.status = 'sent' and OLD.status = 'draft' then
    perform notify_contract_parties(
      NEW, 'contract_received', 'Contract Sent',
      format('Contract "%s" has been sent for signatures.', NEW.title));
  end if;

  if NEW.status = 'cancelled' and OLD.status is distinct from 'cancelled' then
    perform notify_contract_parties(
      NEW, 'contract_cancelled', 'Contract Cancelled',
      format('Contract "%s" has been cancelled.', NEW.title));
  end if;

  if NEW.contractor_signature is not null and OLD.contractor_signature is null then
    perform notify_contract_parties(
      NEW, 'signature_added', 'Contractor Signed',
      format('%s has signed the contract "%s".', NEW.contractor_name, NEW.title));
  end if;

  if NEW.client_signature is not null and OLD.client_signature is null then
    perform notify_contract_parties(
      NEW, 'signature_added', 'Client Signed',
      format('%s has signed the contract "%s".', NEW.client_name, NEW.title));
  end if;

  if NEW.status = 'signed' and OLD.status is distinct from 'signed' then
    perform notify_contract_parties(
      NEW, 'contract_signed', 'Contract Fully Signed',
      format('Contract "%s" is now fully signed by both parties.', NEW.title));
  end if;

  if NEW.contractor_disputed and not OLD.contractor_disputed then
    perform notify_contract_parties(
      NEW, 'dispute_filed', 'Dispute Filed by Contractor',
      format('%s has filed a dispute on contract "%s": %s.',
             NEW.contractor_name, NEW.title,
             coalesce(NEW.contractor_dispute_reason, 'No reason provided')));
  end if;

  if NEW.client_disputed and not OLD.client_disputed then
    perform notify_contract_parties(
      NEW, 'dispute_filed', 'Dispute Filed by Client',
      format('%s has filed a dispute on contract "%s": %s.',
             NEW.client_name, NEW.title,
             coalesce(NEW.client_dispute_reason, 'No reason provided')));
  end if;

  if NEW.ach_transfer_triggered and not OLD.ach_transfer_triggered then
    perform notify_contract_parties(
      NEW, 'ach_initiated', 'ACH Transfer Initiated',
      format('An ACH bank transfer has been initiated for contract "%s".', NEW.title));
  end if;

  if NEW.status = 'completed' and OLD.status is distinct from 'completed' then
    perform notify_contract_parties(
      NEW, 'dispute_window_closed', 'Dispute Window Closed',
      format('The dispute window for "%s" has closed. Contract is completed.', NEW.title));
  end if;

  return NEW;
end;
$$;

create trigger contracts_notifications
  after insert or update on contracts
  for each row execute function handle_contract_notifications();
