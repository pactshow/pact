-- =====================================================================
-- Pact. — notifications trigger
--
-- Replaces the old Base44 `generateNotification` edge function with a
-- native Postgres trigger on `contracts`. Both parties (artist + venue)
-- receive a notification row for each tracked lifecycle event.
-- =====================================================================

-- ---------- helper: insert one notification per contract party -----------

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
  artist_uid uuid;
  venue_uid  uuid;
begin
  select user_id into artist_uid from profiles where id = p_contract.artist_profile_id;
  select user_id into venue_uid  from profiles where id = p_contract.venue_profile_id;

  if artist_uid is not null then
    insert into notifications (user_id, type, title, message, contract_id)
    values (artist_uid, p_type, p_title, p_message, p_contract.id);
  end if;

  if venue_uid is not null and venue_uid is distinct from artist_uid then
    insert into notifications (user_id, type, title, message, contract_id)
    values (venue_uid, p_type, p_title, p_message, p_contract.id);
  end if;
end;
$$;

-- ---------- main trigger function ----------------------------------------

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
        NEW,
        'contract_received',
        'Contract Received',
        format('A new contract "%s" has been sent to %s at %s.',
               NEW.title, NEW.artist_name, NEW.venue_name));
    end if;
    return NEW;
  end if;

  -- UPDATE below
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

  if NEW.artist_signature is not null and OLD.artist_signature is null then
    perform notify_contract_parties(
      NEW, 'signature_added', 'Artist Signed',
      format('%s has signed the contract "%s".', NEW.artist_name, NEW.title));
  end if;

  if NEW.venue_signature is not null and OLD.venue_signature is null then
    perform notify_contract_parties(
      NEW, 'signature_added', 'Venue Signed',
      format('%s has signed the contract "%s".', NEW.venue_name, NEW.title));
  end if;

  if NEW.status = 'signed' and OLD.status is distinct from 'signed' then
    perform notify_contract_parties(
      NEW, 'contract_signed', 'Contract Fully Signed',
      format('Contract "%s" is now fully signed by both parties.', NEW.title));
  end if;

  if NEW.artist_disputed and not OLD.artist_disputed then
    perform notify_contract_parties(
      NEW, 'dispute_filed', 'Dispute Filed by Artist',
      format('%s has filed a dispute on contract "%s": %s.',
             NEW.artist_name, NEW.title,
             coalesce(NEW.artist_dispute_reason, 'No reason provided')));
  end if;

  if NEW.venue_disputed and not OLD.venue_disputed then
    perform notify_contract_parties(
      NEW, 'dispute_filed', 'Dispute Filed by Venue',
      format('%s has filed a dispute on contract "%s": %s.',
             NEW.venue_name, NEW.title,
             coalesce(NEW.venue_dispute_reason, 'No reason provided')));
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

-- ---------- attach trigger -----------------------------------------------

drop trigger if exists contracts_notifications on contracts;

create trigger contracts_notifications
  after insert or update on contracts
  for each row execute function handle_contract_notifications();
