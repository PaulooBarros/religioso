-- Etapa 2, task 1: themes and study items (cards and multiple-choice questions).

-- Systematic theology themes. Top level only for now; subthemes come in Etapa 3.
create table public.themes (
  id text primary key,                          -- slug
  name text not null,
  parent_id text references public.themes (id),
  position smallint not null
);

insert into public.themes (id, name, position) values
  ('escritura', 'Escritura', 1),
  ('deus', 'Deus', 2),
  ('cristo', 'Cristo', 3),
  ('espirito-santo', 'Espírito Santo', 4),
  ('homem-e-pecado', 'Homem e pecado', 5),
  ('salvacao', 'Salvação', 6),
  ('igreja', 'Igreja', 7),
  ('ultimas-coisas', 'Últimas coisas', 8);

alter table public.themes enable row level security;
create policy "themes are readable" on public.themes for select using (true);

-- Study items owned by a profile.
create table public.study_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('card', 'mcq')),
  prompt text not null check (length(trim(prompt)) > 0),
  answer text,                                  -- card: the answer
  options text[],                               -- mcq: alternatives
  correct_option smallint,                      -- mcq: index into options (0-based)
  explanation text,
  theme_id text references public.themes (id),
  level smallint not null default 1 check (level between 1 and 3),
  source_title text,
  source_url text check (source_url is null or source_url ~* '^https?://'),
  bible_refs text[] not null default '{}',
  origin text not null default 'manual' check (origin in ('manual', 'catecismo', 'ia')),
  status text not null default 'approved' check (status in ('draft', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'card' and answer is not null and length(trim(answer)) > 0)
    or (
      kind = 'mcq'
      and options is not null
      and array_length(options, 1) between 2 and 6
      and correct_option is not null
      and correct_option >= 0
      and correct_option < array_length(options, 1)
    )
  )
);

create index study_items_profile_idx on public.study_items (profile_id, created_at desc);
create index study_items_theme_idx on public.study_items (profile_id, theme_id);

create trigger study_items_touch before update on public.study_items
  for each row execute function public.touch_updated_at();

alter table public.study_items enable row level security;

create policy "own study items" on public.study_items
  for all to authenticated
  using (public.owns_profile(profile_id))
  with check (public.owns_profile(profile_id));
