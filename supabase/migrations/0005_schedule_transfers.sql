-- =====================================================================
-- Pact. — Schedule daily transfer job
--
-- pg_cron runs in the database; pg_net is what gives it the ability to
-- make outbound HTTP calls. We use pg_net to invoke the
-- processDisputeWindowPayments edge function once a day.
--
-- Auth: the cron call presents the service_role key as a Bearer token.
-- We read it from Supabase Vault (hosted Supabase doesn't permit
-- `alter database ... set app.settings.X`, so this is the canonical
-- pattern). Run the vault.create_secret() call shown in the deploy
-- notes BEFORE applying this migration.
-- =====================================================================

-- ---------- 1. Enable extensions (idempotent) ---------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------- 2. Wrapper that reads service role key from Vault ----------

create or replace function invoke_process_dispute_window_payments()
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  -- Project URL is not sensitive — it's discoverable in the dashboard
  -- and in any client bundle. Hardcoding avoids a second Vault entry.
  fn_url text := 'https://gutgerovgnbppatzbezv.supabase.co/functions/v1/processDisputeWindowPayments';
  sr_key text;
begin
  select decrypted_secret
    into sr_key
    from vault.decrypted_secrets
   where name = 'pact_service_role_key'
   limit 1;

  if sr_key is null or sr_key = '' then
    raise exception 'Vault secret "pact_service_role_key" is not configured';
  end if;

  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || sr_key
    ),
    body    := '{}'::jsonb
  );
end;
$$;

-- ---------- 3. Schedule it for 03:00 UTC every day ---------------------

-- cron.schedule is safe to call multiple times — it returns the existing
-- job id if the name already exists.

select cron.schedule(
  'pact-process-dispute-window-payments',
  '0 3 * * *',
  $$select invoke_process_dispute_window_payments();$$
);
