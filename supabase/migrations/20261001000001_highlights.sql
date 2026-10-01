-- Verse highlights ("grifos"), one color per verse per profile.

create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  book_id smallint not null references public.bible_books (id),
  chapter smallint not null check (chapter > 0),
  verse smallint not null check (verse > 0),
  color text not null check (color in ('amarelo', 'verde', 'azul', 'rosa')),
  created_at timestamptz not null default now(),
  unique (profile_id, book_id, chapter, verse)
);

create index highlights_profile_chapter_idx on public.highlights (profile_id, book_id, chapter);

alter table public.highlights enable row level security;

create policy "own highlights" on public.highlights
  for all to authenticated
  using (public.owns_profile(profile_id))
  with check (public.owns_profile(profile_id));
