-- Etapa 9, task 1: devotional series and their days.

create table public.devotional_series (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  about text,                                   -- book or theme
  description text,
  template text not null default 'completo' check (template in ('completo', 'soap', 'livre')),
  -- Rhythm: days of the week with a devotional (0 = Sunday … 6 = Saturday). All seven = daily.
  weekdays smallint[] not null default '{0,1,2,3,4,5,6}'
    check (array_length(weekdays, 1) between 1 and 7 and weekdays <@ '{0,1,2,3,4,5,6}'::smallint[]),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'done', 'archived')),
  -- Schedule: the day at anchor_position falls on anchor_date; later days follow the rhythm.
  -- Set when the series is activated and moved forward when it is resumed.
  anchor_position smallint check (anchor_position > 0),
  anchor_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((anchor_position is null) = (anchor_date is null))
);

create index devotional_series_profile_idx on public.devotional_series (profile_id, updated_at desc);

create trigger devotional_series_touch before update on public.devotional_series
  for each row execute function public.touch_updated_at();

create table public.devotionals (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.devotional_series (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  position smallint not null check (position > 0),
  title text not null check (char_length(title) between 1 and 200),
  -- Passage: one chapter, optionally narrowed to a verse range.
  book_id smallint not null references public.bible_books (id),
  chapter smallint not null check (chapter > 0),
  verse_start smallint check (verse_start > 0),
  verse_end smallint check (verse_end is null or verse_end >= verse_start),
  -- Ordered blocks: [{ id, title, text }]
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  read_at timestamptz,
  note text,                                    -- the owner's annotation for the day
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index devotionals_series_idx on public.devotionals (series_id, position);

create trigger devotionals_touch before update on public.devotionals
  for each row execute function public.touch_updated_at();

alter table public.devotional_series enable row level security;
alter table public.devotionals enable row level security;

create policy "own devotional series" on public.devotional_series
  for all to authenticated
  using (public.owns_profile(profile_id))
  with check (public.owns_profile(profile_id));

create policy "own devotionals" on public.devotionals
  for all to authenticated
  using (public.owns_profile(profile_id))
  with check (
    public.owns_profile(profile_id)
    and exists (select 1 from public.devotional_series s where s.id = series_id and s.profile_id = devotionals.profile_id)
  );
