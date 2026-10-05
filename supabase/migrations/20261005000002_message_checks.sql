-- Etapa 4, task 3: checklist before a message is marked as ready.

alter table public.messages
  add column checks text[] not null default '{}'       -- manual checklist items ticked by the owner
    check (coalesce(array_length(checks, 1), 0) <= 40),
  add column ready_at timestamptz;                      -- checklist complete; cleared when the outline changes
