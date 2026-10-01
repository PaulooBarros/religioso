-- The daily release upserts with ON CONFLICT (profile_id, catechism_id, catechism_number),
-- which cannot target a partial index. NULLs are distinct, so a full unique
-- index only constrains catechism items.
drop index public.study_items_catechism_idx;
create unique index study_items_catechism_idx
  on public.study_items (profile_id, catechism_id, catechism_number);
