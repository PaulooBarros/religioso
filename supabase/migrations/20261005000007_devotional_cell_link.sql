-- Etapa 9, task 3: a devotional series can accompany a cell-group series.
alter table public.devotional_series
  add column cell_series_id uuid references public.series (id) on delete set null;
