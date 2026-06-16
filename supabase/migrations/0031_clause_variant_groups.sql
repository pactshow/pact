-- =====================================================================
-- Pact. — Mutually-exclusive clause variant groups
--
-- Some clauses come in flavors that the user picks between rather than
-- stacks (cancellation policy, payment terms, etc). Two new columns on
-- clause_library model this:
--
--   variant_group       — slug shared by all variants in a group, e.g.
--                         'cancellation_terms'. NULL = standalone clause
--                         (existing checkbox behavior preserved).
--   variant_group_label — human label for the group header in the picker,
--                         e.g. 'Cancellation Policy'. Required when
--                         variant_group is set.
--
-- Selection rule (UI-enforced): a contract may include at most ONE clause
-- per variant_group. Standalone clauses are unaffected. Signed contracts
-- already snapshot resolved text + slug, so this change is forward-only.
--
-- Seeds the three cancellation variants as the first group.
-- =====================================================================

alter table clause_library
  add column if not exists variant_group       text,
  add column if not exists variant_group_label text;

alter table clause_library
  drop constraint if exists clause_library_variant_group_label_chk;
alter table clause_library
  add constraint clause_library_variant_group_label_chk
  check (variant_group is null or variant_group_label is not null);

create index if not exists clause_library_variant_group_idx
  on clause_library(variant_group)
  where variant_group is not null;

-- Seed: cancellation policy variants. ON CONFLICT (slug) lets this
-- migration be re-run safely without duplicating rows.
insert into clause_library
  (slug, title, category, content, sort_order, is_active, variables,
   variant_group, variant_group_label)
values
  ('cancellation_full_fee',
   'Venue pays full fee',
   'Cancellation',
   'If Venue cancels this engagement for any reason other than Force Majeure, Venue shall pay Artist one hundred percent (100%) of the agreed performance fee.',
   10, true, '[]'::jsonb,
   'cancellation_terms', 'Cancellation Policy'),
  ('cancellation_half_fee',
   'Venue pays half fee',
   'Cancellation',
   'If Venue cancels this engagement for any reason other than Force Majeure, Venue shall pay Artist fifty percent (50%) of the agreed performance fee.',
   20, true, '[]'::jsonb,
   'cancellation_terms', 'Cancellation Policy'),
  ('cancellation_no_fee',
   'No cancellation fee',
   'Cancellation',
   'Either party may cancel this engagement at any time prior to performance with written notice. No cancellation fee shall be owed by either party.',
   30, true, '[]'::jsonb,
   'cancellation_terms', 'Cancellation Policy')
on conflict (slug) do nothing;
