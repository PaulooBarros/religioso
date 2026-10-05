-- Etapa 4, task 1: cell-group messages written by hand, with versions.

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  -- Passage: one chapter, optionally narrowed to a verse range.
  book_id smallint not null references public.bible_books (id),
  chapter smallint not null check (chapter > 0),
  verse_start smallint check (verse_start > 0),
  verse_end smallint check (verse_end is null or verse_end >= verse_start),
  template text not null default 'expositiva' check (template in ('expositiva', 'tematica', 'narrativa')),
  duration_min smallint not null default 15 check (duration_min between 5 and 90),
  audience text,                                -- who the group is
  topic text,
  -- Ordered blocks: [{ id, kind, title, text }]
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  version integer not null default 1 check (version > 0),   -- number of the working copy
  taught_on date,                               -- null = still being prepared
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index messages_profile_idx on public.messages (profile_id, updated_at desc);

create trigger messages_touch before update on public.messages
  for each row execute function public.touch_updated_at();

-- Snapshots kept by the owner ("Guardar versão") or made before a restore.
create table public.message_versions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  version integer not null check (version > 0),
  title text not null,
  template text not null,
  blocks jsonb not null,
  created_at timestamptz not null default now(),
  unique (message_id, version)
);

alter table public.messages enable row level security;
alter table public.message_versions enable row level security;

create policy "own messages" on public.messages
  for all to authenticated
  using (public.owns_profile(profile_id))
  with check (public.owns_profile(profile_id));

create policy "own message versions" on public.message_versions
  for all to authenticated
  using (exists (select 1 from public.messages m where m.id = message_id and public.owns_profile(m.profile_id)))
  with check (exists (select 1 from public.messages m where m.id = message_id and public.owns_profile(m.profile_id)));
