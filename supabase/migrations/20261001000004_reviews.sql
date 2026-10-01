-- Etapa 2, task 2: spaced repetition state and review log.

-- Scheduling state of each study item (one row once the item was first reviewed).
create table public.review_states (
  item_id uuid primary key references public.study_items (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  state text not null check (state in ('learning', 'review', 'relearning')),
  ease real not null default 2.5 check (ease >= 1.3),
  interval_days real not null default 0 check (interval_days >= 0),
  reps integer not null default 0,
  lapses integer not null default 0,
  due_at timestamptz not null,
  last_grade smallint check (last_grade between 1 and 4),
  last_reviewed_at timestamptz
);

create index review_states_due_idx on public.review_states (profile_id, due_at);

-- Every answer. Feeds the day streak, session summaries and undo.
create table public.review_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.study_items (id) on delete cascade,
  grade smallint not null check (grade between 1 and 4),
  mode text not null default 'dia' check (mode in ('dia', 'erros')),
  reviewed_at timestamptz not null default now(),
  prev_state jsonb,                      -- state before this answer (null = was new)
  next_due_at timestamptz not null
);

create index review_logs_profile_idx on public.review_logs (profile_id, reviewed_at desc);

alter table public.review_states enable row level security;
alter table public.review_logs enable row level security;

-- The item must belong to the same profile as the row.
create policy "own review states" on public.review_states
  for all to authenticated
  using (public.owns_profile(profile_id))
  with check (
    public.owns_profile(profile_id)
    and exists (select 1 from public.study_items i where i.id = item_id and i.profile_id = review_states.profile_id)
  );

create policy "own review logs" on public.review_logs
  for all to authenticated
  using (public.owns_profile(profile_id))
  with check (
    public.owns_profile(profile_id)
    and exists (select 1 from public.study_items i where i.id = item_id and i.profile_id = review_logs.profile_id)
  );
