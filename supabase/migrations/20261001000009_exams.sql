-- Etapa 3, task 2: mock exams ("simulados").

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  theme_ids text[] not null default '{}',       -- empty = mixed (all themes)
  time_limit_min smallint check (time_limit_min is null or time_limit_min between 1 and 240),
  status text not null default 'running' check (status in ('running', 'finished', 'abandoned')),
  total smallint not null check (total > 0),
  score smallint,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index exams_profile_idx on public.exams (profile_id, started_at desc);

-- One row per question of the exam. The question is copied at exam time so
-- the answer key stays the same even if the item is edited or deleted later.
create table public.exam_answers (
  exam_id uuid not null references public.exams (id) on delete cascade,
  position smallint not null check (position > 0),
  item_id uuid references public.study_items (id) on delete set null,
  theme_id text references public.themes (id),
  prompt text not null,
  options text[] not null,
  correct_option smallint not null,
  explanation text,
  source_title text,
  source_url text,
  chosen smallint,
  flagged boolean not null default false,
  is_correct boolean,
  primary key (exam_id, position)
);

alter table public.exams enable row level security;
alter table public.exam_answers enable row level security;

create policy "own exams" on public.exams
  for all to authenticated
  using (public.owns_profile(profile_id))
  with check (public.owns_profile(profile_id));

create policy "own exam answers" on public.exam_answers
  for all to authenticated
  using (exists (select 1 from public.exams e where e.id = exam_id and public.owns_profile(e.profile_id)))
  with check (exists (select 1 from public.exams e where e.id = exam_id and public.owns_profile(e.profile_id)));
