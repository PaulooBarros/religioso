-- Catechisms: public-domain original texts with a labelled machine translation.
-- Questions are reference data; each profile enrolls and receives a few new
-- questions per day as study items in the daily review.

create table public.catechisms (
  id text primary key,                          -- slug
  name text not null,
  year text not null,
  original_lang text not null,                  -- language of question_original
  source_id uuid not null references public.sources (id),
  source_url text not null,                     -- where the original can be read
  translation_note text not null,               -- how the Portuguese text was produced
  position smallint not null
);

create table public.catechism_questions (
  catechism_id text not null references public.catechisms (id) on delete cascade,
  number smallint not null check (number > 0),
  question_original text not null,
  answer_original text not null,
  question_en text,                             -- older English translation, when the original is not English
  answer_en text,
  question_pt text not null,                    -- machine translation of the original
  answer_pt text not null,
  bible_refs text[] not null default '{}',
  primary key (catechism_id, number)
);

alter table public.catechisms enable row level security;
alter table public.catechism_questions enable row level security;
create policy "catechisms are readable" on public.catechisms for select using (true);
create policy "catechism questions are readable" on public.catechism_questions for select using (true);

-- A profile studying a catechism at a chosen pace.
create table public.catechism_enrollments (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  catechism_id text not null references public.catechisms (id) on delete cascade,
  per_day smallint not null default 4 check (per_day between 1 and 20),
  state text not null default 'active' check (state in ('active', 'paused')),
  started_at timestamptz not null default now(),
  primary key (profile_id, catechism_id)
);

alter table public.catechism_enrollments enable row level security;
create policy "own catechism enrollments" on public.catechism_enrollments
  for all to authenticated
  using (public.owns_profile(profile_id))
  with check (public.owns_profile(profile_id));

-- Released questions become study items of the profile.
alter table public.study_items
  add column catechism_id text references public.catechisms (id),
  add column catechism_number smallint;

create unique index study_items_catechism_idx on public.study_items (profile_id, catechism_id, catechism_number)
  where catechism_id is not null;
