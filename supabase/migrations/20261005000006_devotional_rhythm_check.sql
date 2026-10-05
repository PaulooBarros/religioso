-- array_length() of an empty array is null, so the original check let an
-- empty rhythm through. cardinality() returns 0 for it.
alter table public.devotional_series
  add constraint devotional_series_weekdays_not_empty check (cardinality(weekdays) between 1 and 7);
