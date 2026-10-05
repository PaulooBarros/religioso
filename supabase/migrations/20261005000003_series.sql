-- Etapa 4, task 4: series of cell-group messages (usually 4 to 6 weeks).

create table public.series (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  about text,                                   -- book or theme the series covers
  template text not null default 'expositiva' check (template in ('expositiva', 'tematica', 'narrativa')),
  duration_min smallint not null default 15 check (duration_min between 5 and 90),
  audience text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index series_profile_idx on public.series (profile_id, updated_at desc);

create trigger series_touch before update on public.series
  for each row execute function public.touch_updated_at();

alter table public.series enable row level security;

create policy "own series" on public.series
  for all to authenticated
  using (public.owns_profile(profile_id))
  with check (public.owns_profile(profile_id));

-- A week of a series is a message. Deleting the series keeps its messages.
alter table public.messages
  add column series_id uuid references public.series (id) on delete set null,
  add column series_position smallint check (series_position is null or series_position > 0);

create index messages_series_idx on public.messages (series_id, series_position) where series_id is not null;
