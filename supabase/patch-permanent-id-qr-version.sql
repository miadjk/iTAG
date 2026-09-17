-- Permanent Property ID + QR version tracking for self-contained offline QR codes.
-- Safe to re-run.

alter table public.properties
  add column if not exists permanent_id text,
  add column if not exists qr_version integer not null default 1;

create unique index if not exists properties_permanent_id_uidx
  on public.properties (permanent_id)
  where permanent_id is not null and btrim(permanent_id) <> '';

-- Allocate next PROP-YYYY-NNNN for the current year (global sequence by year).
create or replace function public.allocate_permanent_property_id()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year text := to_char(timezone('Asia/Manila', now()), 'YYYY');
  v_prefix text := 'PROP-' || v_year || '-';
  v_max int := 0;
  v_next text;
begin
  select coalesce(max(nullif(regexp_replace(permanent_id, '^PROP-[0-9]{4}-', ''), '')::int), 0)
    into v_max
  from public.properties
  where permanent_id ~ ('^PROP-' || v_year || '-[0-9]+$');

  v_next := v_prefix || lpad((v_max + 1)::text, 4, '0');
  return v_next;
end;
$$;

revoke all on function public.allocate_permanent_property_id() from public;
grant execute on function public.allocate_permanent_property_id() to authenticated;

-- Backfill existing rows that lack a permanent id (keeps qr_code / uuid unchanged).
do $$
declare
  r record;
  v_id text;
begin
  for r in
    select id
    from public.properties
    where permanent_id is null or btrim(permanent_id) = ''
    order by created_at asc, id asc
  loop
    v_id := public.allocate_permanent_property_id();
    update public.properties
      set permanent_id = v_id
      where id = r.id;
  end loop;
end;
$$;
