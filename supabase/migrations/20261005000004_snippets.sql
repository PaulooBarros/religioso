-- Etapa 4, task 5: reusable illustrations and discussion questions.

create table public.snippets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('ilustracao', 'pergunta')),
  body text not null check (char_length(body) between 1 and 4000),
  topic text,
  bible_ref text,                               -- normalized references, checked against the base
  source_title text,
  source_url text check (source_url is null or source_url ~* '^https?://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index snippets_profile_idx on public.snippets (profile_id, kind, updated_at desc);

create trigger snippets_touch before update on public.snippets
  for each row execute function public.touch_updated_at();

-- Which messages a snippet was inserted into, so the group does not hear it twice.
create table public.snippet_uses (
  snippet_id uuid not null references public.snippets (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  used_at timestamptz not null default now(),
  primary key (snippet_id, message_id)
);

alter table public.snippets enable row level security;
alter table public.snippet_uses enable row level security;

create policy "own snippets" on public.snippets
  for all to authenticated
  using (public.owns_profile(profile_id))
  with check (public.owns_profile(profile_id));

create policy "own snippet uses" on public.snippet_uses
  for all to authenticated
  using (exists (select 1 from public.snippets s where s.id = snippet_id and public.owns_profile(s.profile_id)))
  with check (
    exists (select 1 from public.snippets s where s.id = snippet_id and public.owns_profile(s.profile_id))
    and exists (select 1 from public.messages m where m.id = message_id and public.owns_profile(m.profile_id))
  );
