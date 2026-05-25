-- =====================================================================
-- Pact. — Custom billing terms per subscription
--
-- For enterprise / negotiated deals (e.g. music festivals): override
-- the platform default fee and/or monthly price on a per-subscription
-- basis. Pact admins set these via the AdminBilling page; the cron and
-- PaymentIntent code read them when present.
--
-- custom_fee_bps: bps override (e.g. 50 = 0.50%). null = use PACT_FEE_BPS.
-- custom_monthly_price_id: Stripe Price ID to charge instead of the
--   tier's default. The admin still needs to swap the actual Stripe
--   Subscription to this price via the dashboard — this column is the
--   record of what we agreed to.
-- =====================================================================

alter table subscriptions
  add column if not exists custom_fee_bps smallint
    check (custom_fee_bps is null or (custom_fee_bps >= 0 and custom_fee_bps <= 10000));

alter table subscriptions
  add column if not exists custom_monthly_price_id text;

-- Admins can list every subscription (for the admin billing panel) and
-- update the override columns. Service role bypasses RLS anyway, so the
-- existing select-own + insert-own + update-own policies stay intact.
drop policy if exists subscriptions_select_admin on subscriptions;
create policy subscriptions_select_admin on subscriptions
  for select to authenticated
  using (exists (
    select 1 from profiles where user_id = auth.uid() and is_admin = true
  ));

drop policy if exists subscriptions_update_admin on subscriptions;
create policy subscriptions_update_admin on subscriptions
  for update to authenticated
  using (exists (
    select 1 from profiles where user_id = auth.uid() and is_admin = true
  ))
  with check (exists (
    select 1 from profiles where user_id = auth.uid() and is_admin = true
  ));

notify pgrst, 'reload schema';
