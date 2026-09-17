-- Extend public QR lookup to return classification, type, and code from the live property row.
-- Apply in the Supabase SQL editor (after patch-property-classification-types.sql).
-- DROP is required because the return columns change.

drop function if exists public.public_property_by_qr(text);

create function public.public_property_by_qr(p_token text)
returns table (
  id uuid,
  entity_name text,
  ics_number text,
  inventory_item_number text,
  description text,
  classification text,
  type text,
  code text,
  date_acquired date,
  unit_of_measure text,
  quantity numeric,
  unit_cost numeric,
  total_cost numeric,
  custodian_last_user text,
  fund_source text,
  estimated_useful_life text,
  qr_code text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.entity_name,
    p.ics_number,
    p.inventory_item_number,
    p.description,
    p.classification,
    p.type,
    p.code,
    p.date_acquired,
    p.unit_of_measure,
    p.quantity,
    p.unit_cost,
    p.total_cost,
    p.custodian_last_user,
    p.fund_source,
    p.estimated_useful_life,
    p.qr_code
  from public.properties p
  where p.qr_code = p_token
    and char_length(coalesce(p_token, '')) >= 16
  limit 1
$$;

revoke all on function public.public_property_by_qr(text) from public;
grant execute on function public.public_property_by_qr(text) to anon, authenticated;
