-- =====================================================================
-- Pact. — contract_templates
-- Run this in the Supabase SQL editor after 0001.
-- =====================================================================

create type balance_due_timing as enum ('day_of', 'days_after', 'days_before');

create table contract_templates (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  name                     text not null,
  description              text,
  set_length               text,
  deposit_percentage       numeric(5,2),
  deposit_due_days_before  integer,
  balance_due_timing       balance_due_timing,
  load_in_hours_before     numeric(4,2),
  technical_requirements   text,
  hospitality_requirements text,
  additional_terms         text,
  contract_sections        jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index contract_templates_user_id_idx on contract_templates(user_id);

create trigger contract_templates_set_updated_at
  before update on contract_templates
  for each row execute function set_updated_at();

alter table contract_templates enable row level security;

create policy "contract_templates: owner reads"
  on contract_templates for select to authenticated
  using (user_id = auth.uid());

create policy "contract_templates: owner inserts"
  on contract_templates for insert to authenticated
  with check (user_id = auth.uid());

create policy "contract_templates: owner updates"
  on contract_templates for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "contract_templates: owner deletes"
  on contract_templates for delete to authenticated
  using (user_id = auth.uid());
