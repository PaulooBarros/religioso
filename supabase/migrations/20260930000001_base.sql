-- Etapa 1: sources and licenses, Bible text, profiles, notes and bookmarks.

-- ---------------------------------------------------------------------------
-- Sources and licenses. No embedded text may exist without a source row.
-- ---------------------------------------------------------------------------
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  author text,               -- author or translator(s)
  year text,
  license text not null,
  license_url text,
  url text not null,
  verified_at date not null,
  required_credit text,
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.sources is 'Origin and license of every embedded text.';

-- ---------------------------------------------------------------------------
-- Bible text (only freely licensed translations are embedded).
-- ---------------------------------------------------------------------------
create table public.bible_translations (
  id text primary key,                         -- e.g. 'blivre'
  name text not null,
  abbrev text not null,
  source_id uuid not null references public.sources (id)
);

create table public.bible_books (
  id smallint primary key check (id between 1 and 66),
  code text not null unique,                   -- VPL code, e.g. 'ROM'
  name text not null,
  abbrev text not null,
  slug text not null unique,
  testament text not null check (testament in ('OT', 'NT')),
  chapters smallint not null check (chapters > 0)
);

create table public.bible_verses (
  translation_id text not null references public.bible_translations (id),
  book_id smallint not null references public.bible_books (id),
  chapter smallint not null check (chapter > 0),
  verse smallint not null check (verse > 0),
  text text not null,
  primary key (translation_id, book_id, chapter, verse)
);

-- ---------------------------------------------------------------------------
-- Profiles: several study profiles inside one login account. Each profile
-- owns its bookmarks, notes, progress and reviews.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create index profiles_owner_idx on public.profiles (owner_id);

-- True when the given profile belongs to the signed-in user.
create function public.owns_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_profile_id and p.owner_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Bookmarks. One automatic "onde parei" bookmark per profile (is_last_read).
-- ---------------------------------------------------------------------------
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  book_id smallint not null references public.bible_books (id),
  chapter smallint not null check (chapter > 0),
  verse smallint check (verse > 0),
  name text check (name is null or length(name) <= 120),
  tag text check (tag is null or length(tag) <= 40),
  is_last_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index bookmarks_last_read_idx on public.bookmarks (profile_id) where is_last_read;
create index bookmarks_profile_chapter_idx on public.bookmarks (profile_id, book_id, chapter);

-- ---------------------------------------------------------------------------
-- Notes, linked to one or more passages.
-- ---------------------------------------------------------------------------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_profile_idx on public.notes (profile_id, updated_at desc);

create table public.note_passages (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  book_id smallint not null references public.bible_books (id),
  chapter smallint not null check (chapter > 0),
  verse_start smallint check (verse_start > 0),
  verse_end smallint check (verse_end > 0),
  check (verse_end is null or (verse_start is not null and verse_end >= verse_start))
);

create index note_passages_chapter_idx on public.note_passages (book_id, chapter);
create index note_passages_note_idx on public.note_passages (note_id);

-- Keep updated_at current.
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger bookmarks_touch before update on public.bookmarks
  for each row execute function public.touch_updated_at();
create trigger notes_touch before update on public.notes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.sources enable row level security;
alter table public.bible_translations enable row level security;
alter table public.bible_books enable row level security;
alter table public.bible_verses enable row level security;
alter table public.profiles enable row level security;
alter table public.bookmarks enable row level security;
alter table public.notes enable row level security;
alter table public.note_passages enable row level security;

-- Reference data: readable by anyone, written only with the service key
-- (import scripts), which bypasses RLS.
create policy "sources are readable" on public.sources for select using (true);
create policy "translations are readable" on public.bible_translations for select using (true);
create policy "books are readable" on public.bible_books for select using (true);
create policy "verses are readable" on public.bible_verses for select using (true);

-- Profiles: only the account that owns them.
create policy "own profiles" on public.profiles
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "own bookmarks" on public.bookmarks
  for all to authenticated
  using (public.owns_profile(profile_id))
  with check (public.owns_profile(profile_id));

create policy "own notes" on public.notes
  for all to authenticated
  using (public.owns_profile(profile_id))
  with check (public.owns_profile(profile_id));

create policy "own note passages" on public.note_passages
  for all to authenticated
  using (exists (select 1 from public.notes n where n.id = note_id and public.owns_profile(n.profile_id)))
  with check (exists (select 1 from public.notes n where n.id = note_id and public.owns_profile(n.profile_id)));
