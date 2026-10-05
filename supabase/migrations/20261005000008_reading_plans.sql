-- Etapa 10, task 1: Bible reading plans.
-- The days of a plan are not stored: they are derived from the book range,
-- the number of days and the verse counts of the Bible text.

create table public.reading_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  book_start smallint not null references public.bible_books (id),
  book_end smallint not null references public.bible_books (id),
  days smallint not null check (days between 1 and 1100),
  start_date date not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (book_end >= book_start)
);

create index reading_plans_profile_idx on public.reading_plans (profile_id, created_at desc);

create trigger reading_plans_touch before update on public.reading_plans
  for each row execute function public.touch_updated_at();

create table public.reading_plan_days (
  plan_id uuid not null references public.reading_plans (id) on delete cascade,
  day smallint not null check (day > 0),
  read_at timestamptz not null default now(),
  primary key (plan_id, day)
);

alter table public.reading_plans enable row level security;
alter table public.reading_plan_days enable row level security;

create policy "own reading plans" on public.reading_plans
  for all to authenticated
  using (public.owns_profile(profile_id))
  with check (public.owns_profile(profile_id));

create policy "own reading plan days" on public.reading_plan_days
  for all to authenticated
  using (exists (select 1 from public.reading_plans p where p.id = plan_id and public.owns_profile(p.profile_id)))
  with check (exists (select 1 from public.reading_plans p where p.id = plan_id and public.owns_profile(p.profile_id)));
