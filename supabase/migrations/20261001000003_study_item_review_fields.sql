-- Fields needed for imported/AI-drafted study items: batch id, subtopic,
-- machine translation flag, reviewer note and the result of the link check.

alter table public.study_items
  add column external_id text,
  add column subtopic text,
  add column machine_translated boolean not null default false,
  add column review_note text,
  add column source_checked_at timestamptz,
  add column source_ok boolean;

-- Re-importing the same batch updates instead of duplicating.
create unique index study_items_external_idx on public.study_items (profile_id, external_id)
  where external_id is not null;

comment on column public.study_items.source_ok is
  'Result of the last link check: true = opened, false = did not open, null = not checked.';
