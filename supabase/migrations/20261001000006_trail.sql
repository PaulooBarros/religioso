-- Etapa 3, task 1: systematic theology trail.
-- Subthemes and readings belong to a profile (the owner builds the structure).

create table public.subthemes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  theme_id text not null references public.themes (id),
  name text not null check (length(trim(name)) between 1 and 120),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (profile_id, theme_id, name)
);

create index subthemes_theme_idx on public.subthemes (profile_id, theme_id, position);

alter table public.study_items
  add column subtheme_id uuid references public.subthemes (id) on delete set null;

-- Build subthemes from the subtopics that came with the imported batches.
-- The subtheme is the last segment ("Fé batista: igreja e ordenanças · Batismo" -> "Batismo").
with labels as (
  select profile_id, theme_id,
         trim(regexp_replace(subtopic, '^.*·\s*', '')) as name,
         min(created_at) as first_at,
         min(coalesce(external_id, '')) as first_ext
  from public.study_items
  where subtopic is not null and theme_id is not null
  group by 1, 2, 3
)
insert into public.subthemes (profile_id, theme_id, name, position)
select profile_id, theme_id, name,
       row_number() over (partition by profile_id, theme_id order by first_at, first_ext)
from labels
where name <> '';

update public.study_items i
set subtheme_id = s.id
from public.subthemes s
where s.profile_id = i.profile_id
  and s.theme_id = i.theme_id
  and s.name = trim(regexp_replace(i.subtopic, '^.*·\s*', ''));

-- Readings recommended for a theme or subtheme.
create table public.readings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  theme_id text not null references public.themes (id),
  subtheme_id uuid references public.subthemes (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 300),
  url text check (url is null or url ~* '^https?://'),
  bible_ref text,
  position integer not null default 0,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index readings_theme_idx on public.readings (profile_id, theme_id);

-- Notes can also belong to a theme (and subtheme), not only to passages.
alter table public.notes
  add column theme_id text references public.themes (id),
  add column subtheme_id uuid references public.subthemes (id) on delete set null;

create index notes_theme_idx on public.notes (profile_id, theme_id);

-- Review sessions can now be focused on a theme, and later on a mock exam.
alter table public.review_logs drop constraint review_logs_mode_check;
alter table public.review_logs add constraint review_logs_mode_check check (mode in ('dia', 'erros', 'tema', 'simulado'));

alter table public.subthemes enable row level security;
alter table public.readings enable row level security;

create policy "own subthemes" on public.subthemes
  for all to authenticated
  using (public.owns_profile(profile_id))
  with check (public.owns_profile(profile_id));

create policy "own readings" on public.readings
  for all to authenticated
  using (public.owns_profile(profile_id))
  with check (public.owns_profile(profile_id));
