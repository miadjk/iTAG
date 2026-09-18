-- Soft-delete for consumable supplies (preserves stock_transactions history).
alter table public.consumable_supplies
  add column if not exists archived boolean not null default false;

create index if not exists consumable_supplies_archived_idx
  on public.consumable_supplies (school_id, archived);
