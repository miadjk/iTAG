-- Supply classification + richer stock transaction history + atomic stock movement.
-- Apply in the Supabase SQL editor.

alter table public.consumable_supplies
  add column if not exists classification text not null default 'consumable',
  add column if not exists type text not null default '',
  add column if not exists code text not null default '';

alter table public.stock_transactions
  add column if not exists previous_quantity numeric not null default 0,
  add column if not exists new_quantity numeric not null default 0,
  add column if not exists received_by text not null default '',
  add column if not exists position text not null default '';

-- Exact identity lookup for grouping: same school + name + unit + classification + type + code
create index if not exists consumable_supplies_identity_idx
  on public.consumable_supplies (
    school_id,
    lower(btrim(name)),
    lower(btrim(unit)),
    classification,
    lower(btrim(type)),
    lower(btrim(code))
  );

create or replace function public.apply_stock_movement(
  p_supply_id uuid,
  p_type text,
  p_quantity numeric,
  p_date date,
  p_received_by text,
  p_position text,
  p_remarks text,
  p_reference text default ''
)
returns table (
  supply_id uuid,
  transaction_id uuid,
  previous_quantity numeric,
  new_quantity numeric,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school text;
  v_prev numeric;
  v_min numeric;
  v_new numeric;
  v_status text;
  v_tx uuid;
  v_name text;
  v_unit text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if public.current_role() is distinct from 'property_custodian' then
    raise exception 'Not authorized';
  end if;
  if p_type not in ('in', 'out') then
    raise exception 'Invalid stock movement type';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Enter a valid quantity.';
  end if;

  select s.school_id, s.current_quantity, s.minimum_stock_level, s.name, s.unit
    into v_school, v_prev, v_min, v_name, v_unit
  from public.consumable_supplies s
  where s.id = p_supply_id
  for update;

  if v_school is null then
    raise exception 'Supply not found.';
  end if;
  if not public.is_school_member(v_school) then
    raise exception 'Not authorized';
  end if;

  if p_type = 'out' then
    if p_quantity > v_prev then
      raise exception 'Insufficient stock. Only % units are currently available.', trim(to_char(v_prev, 'FM999999999990.######'));
    end if;
    v_new := v_prev - p_quantity;
  else
    v_new := v_prev + p_quantity;
  end if;

  if v_new <= 0 then
    v_status := 'out_of_stock';
  elsif v_new <= coalesce(v_min, 0) then
    v_status := 'low_stock';
  else
    v_status := 'available';
  end if;

  update public.consumable_supplies
  set current_quantity = v_new,
      status = v_status
  where id = p_supply_id;

  insert into public.stock_transactions (
    supply_id,
    type,
    quantity,
    previous_quantity,
    new_quantity,
    date,
    reference,
    recipient,
    purpose,
    received_by,
    position,
    performed_by
  ) values (
    p_supply_id,
    p_type,
    p_quantity,
    v_prev,
    v_new,
    p_date,
    coalesce(nullif(p_reference, ''), coalesce(p_remarks, '')),
    nullif(p_received_by, ''),
    nullif(p_remarks, ''),
    coalesce(p_received_by, ''),
    coalesce(p_position, ''),
    auth.uid()
  )
  returning id into v_tx;

  supply_id := p_supply_id;
  transaction_id := v_tx;
  previous_quantity := v_prev;
  new_quantity := v_new;
  status := v_status;
  return next;
end;
$$;

revoke all on function public.apply_stock_movement(uuid, text, numeric, date, text, text, text, text) from public;
grant execute on function public.apply_stock_movement(uuid, text, numeric, date, text, text, text, text) to authenticated;
