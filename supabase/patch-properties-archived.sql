-- Soft-delete for properties (preserves assignments, transfers, and history).
alter table public.properties
  add column if not exists archived boolean not null default false;

create index if not exists properties_archived_idx
  on public.properties (school_id, archived);
