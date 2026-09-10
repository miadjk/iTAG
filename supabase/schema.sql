-- iTAG production schema
-- Apply in the Supabase SQL editor (or supabase db push).
-- Auth: profiles.id = auth.users.id
-- Isolation: school_id from the signed-in profile
-- Public QR: only public_property_by_qr(token) is available to anon

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  middle_name text not null default '',
  last_name text not null,
  email text not null unique,
  role text not null check (role in ('school_head', 'property_custodian')),
  school_id text,
  region_id text,
  province_id text,
  municipality_id text,
  district_id text,
  active boolean not null default true,
  must_update_credentials boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  school_id text not null,
  created_by uuid references public.profiles(id),
  classification text not null check (classification in ('low_value', 'high_value')),
  entity_name text not null default '',
  fund_cluster text not null default '',
  ics_number text not null,
  inventory_item_number text not null,
  description text not null,
  quantity numeric not null default 1 check (quantity > 0),
  unit_of_measure text not null default 'Unit',
  date_acquired date,
  acquisition_reference text not null default '',
  unit_cost numeric not null default 0 check (unit_cost >= 0),
  total_cost numeric not null default 0,
  fund_source text not null default '',
  custodian_last_user text not null default '',
  current_accountable_person text not null default '',
  office_department text not null default '',
  location text not null default '',
  estimated_useful_life text not null default '',
  condition text not null default 'serviceable',
  status text not null default 'idle',
  remarks text not null default '',
  brand text not null default '',
  model text not null default '',
  serial_number text not null default '',
  warranty text not null default '',
  qr_code text not null unique default encode(gen_random_bytes(16), 'hex'),
  excel_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_item_unique unique (school_id, inventory_item_number)
);

create table if not exists public.property_assignments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  accountable_person text not null,
  assigned_user_id uuid references public.profiles(id),
  office_department text not null default '',
  location text not null default '',
  date_assigned date,
  deadline date,
  status text not null default 'active' check (status in ('pending', 'active', 'completed')),
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.property_transfers (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  previous_accountable_person text,
  new_accountable_person text not null,
  previous_office text,
  new_office text,
  previous_location text,
  new_location text,
  date date,
  reason text not null default '',
  performed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.property_history (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  action text not null,
  summary text not null,
  previous_value text,
  new_value text,
  user_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.consumable_supplies (
  id uuid primary key default gen_random_uuid(),
  school_id text not null,
  name text not null,
  description text not null default '',
  unit text not null default '',
  current_quantity numeric not null default 0,
  minimum_stock_level numeric not null default 0,
  location text not null default '',
  status text not null,
  remarks text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  supply_id uuid not null references public.consumable_supplies(id) on delete cascade,
  type text not null check (type in ('in', 'out')),
  quantity numeric not null,
  date date,
  reference text not null default '',
  recipient text,
  purpose text,
  performed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,
  record_type text,
  record_id text,
  previous_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index if not exists properties_school_ics_idx on public.properties (school_id, ics_number);
create index if not exists properties_school_item_idx on public.properties (school_id, inventory_item_number);
create index if not exists properties_qr_idx on public.properties (qr_code);
create index if not exists profiles_school_idx on public.profiles (school_id);
create index if not exists assignments_property_idx on public.property_assignments (property_id);
create index if not exists transfers_property_idx on public.property_transfers (property_id);
create index if not exists history_property_idx on public.property_history (property_id);
create index if not exists notifications_user_idx on public.notifications (user_id, read);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists properties_updated_at on public.properties;
create trigger properties_updated_at before update on public.properties
for each row execute function public.set_updated_at();

drop trigger if exists supplies_updated_at on public.consumable_supplies;
create trigger supplies_updated_at before update on public.consumable_supplies
for each row execute function public.set_updated_at();

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid() and active = true
$$;

create or replace function public.current_school_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select school_id from public.profiles where id = auth.uid() and active = true
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true
$$;

create or replace function public.is_school_member(target_school text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(target_school, '') <> ''
    and target_school = (select school_id from public.profiles where id = auth.uid() and active = true)
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  chosen_role text := coalesce(nullif(meta->>'role', ''), 'property_custodian');
  incoming_school text := nullif(meta->>'school_id', '');
  existing_head uuid;
  created_by_admin boolean := coalesce(meta->>'created_by_admin', '') = 'true';
begin
  if chosen_role not in ('school_head', 'property_custodian') then
    chosen_role := 'property_custodian';
  end if;

  if incoming_school is not null then
    select id into existing_head
    from public.profiles
    where school_id = incoming_school and role = 'school_head' and active = true
    limit 1;
  end if;

  if not created_by_admin then
    chosen_role := 'property_custodian';
  elsif chosen_role = 'school_head' and existing_head is not null then
    raise exception 'This school already has a School Head';
  end if;

  insert into public.profiles (
    id, first_name, middle_name, last_name, email, role,
    school_id, region_id, province_id, municipality_id, district_id, active
  ) values (
    new.id,
    coalesce(nullif(meta->>'first_name', ''), 'User'),
    coalesce(meta->>'middle_name', ''),
    coalesce(nullif(meta->>'last_name', ''), 'Account'),
    coalesce(new.email, ''),
    chosen_role,
    incoming_school,
    nullif(meta->>'region_id', ''),
    nullif(meta->>'province_id', ''),
    nullif(meta->>'municipality_id', ''),
    nullif(meta->>'district_id', ''),
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.public_property_by_qr(p_token text)
returns table (
  id uuid,
  entity_name text,
  ics_number text,
  inventory_item_number text,
  description text,
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
  limit 1
$$;

revoke all on function public.public_property_by_qr(text) from public;
grant execute on function public.public_property_by_qr(text) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_assignments enable row level security;
alter table public.property_transfers enable row level security;
alter table public.property_history enable row level security;
alter table public.consumable_supplies enable row level security;
alter table public.stock_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles select school" on public.profiles;
create policy "profiles select school" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_school_member(school_id));

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles update head" on public.profiles;
create policy "profiles update head" on public.profiles
  for update to authenticated
  using (public.current_role() = 'school_head' and public.is_school_member(school_id))
  with check (public.current_role() = 'school_head' and public.is_school_member(school_id));

drop policy if exists "properties crud school" on public.properties;
drop policy if exists "properties select school" on public.properties;
drop policy if exists "properties insert custodian" on public.properties;
drop policy if exists "properties update custodian" on public.properties;
drop policy if exists "properties delete custodian" on public.properties;
create policy "properties select school" on public.properties
  for select to authenticated
  using (public.is_school_member(school_id));

create policy "properties insert custodian" on public.properties
  for insert to authenticated
  with check (public.is_school_member(school_id) and public.current_role() = 'property_custodian');

create policy "properties update custodian" on public.properties
  for update to authenticated
  using (public.is_school_member(school_id) and public.current_role() in ('property_custodian', 'school_head'))
  with check (public.is_school_member(school_id) and public.current_role() in ('property_custodian', 'school_head'));

create policy "properties delete custodian" on public.properties
  for delete to authenticated
  using (public.is_school_member(school_id) and public.current_role() = 'property_custodian');

drop policy if exists "assignments school" on public.property_assignments;
create policy "assignments select" on public.property_assignments
  for select to authenticated
  using (exists (
    select 1 from public.properties p
    where p.id = property_id and public.is_school_member(p.school_id)
  ));

create policy "assignments insert" on public.property_assignments
  for insert to authenticated
  with check (
    public.current_role() in ('property_custodian', 'school_head')
    and exists (
      select 1 from public.properties p
      where p.id = property_id and public.is_school_member(p.school_id)
    )
  );

drop policy if exists "transfers school" on public.property_transfers;
create policy "transfers select" on public.property_transfers
  for select to authenticated
  using (exists (
    select 1 from public.properties p
    where p.id = property_id and public.is_school_member(p.school_id)
  ));

create policy "transfers insert" on public.property_transfers
  for insert to authenticated
  with check (
    public.current_role() = 'property_custodian'
    and exists (
      select 1 from public.properties p
      where p.id = property_id and public.is_school_member(p.school_id)
    )
  );

create policy "history select" on public.property_history
  for select to authenticated
  using (exists (
    select 1 from public.properties p
    where p.id = property_id and public.is_school_member(p.school_id)
  ));

create policy "history insert" on public.property_history
  for insert to authenticated
  with check (exists (
    select 1 from public.properties p
    where p.id = property_id and public.is_school_member(p.school_id)
  ));

create policy "supplies select" on public.consumable_supplies
  for select to authenticated
  using (public.is_school_member(school_id));

create policy "supplies write" on public.consumable_supplies
  for all to authenticated
  using (public.is_school_member(school_id) and public.current_role() = 'property_custodian')
  with check (public.is_school_member(school_id) and public.current_role() = 'property_custodian');

create policy "stock select" on public.stock_transactions
  for select to authenticated
  using (exists (
    select 1 from public.consumable_supplies s
    where s.id = supply_id and public.is_school_member(s.school_id)
  ));

create policy "stock insert" on public.stock_transactions
  for insert to authenticated
  with check (
    public.current_role() = 'property_custodian'
    and exists (
      select 1 from public.consumable_supplies s
      where s.id = supply_id and public.is_school_member(s.school_id)
    )
  );

create policy "notifications select" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy "notifications update" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications insert" on public.notifications
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or (
      public.is_school_member((select school_id from public.profiles where id = user_id))
    )
  );

create policy "audit select" on public.audit_logs
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      public.current_role() = 'school_head'
      and public.is_school_member((select school_id from public.profiles where id = audit_logs.user_id))
    )
  );

create policy "audit insert" on public.audit_logs
  for insert to authenticated
  with check (user_id = auth.uid());

create table if not exists public.inventory_verifications (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  verified_by uuid references public.profiles(id),
  date date,
  location text not null default '',
  accountable_person text not null default '',
  condition text not null default 'serviceable',
  status text not null default 'idle',
  existence_confirmed boolean not null default true,
  verification_status text not null default 'verified',
  remarks text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.generated_reports (
  id uuid primary key default gen_random_uuid(),
  school_id text not null,
  created_by uuid references public.profiles(id),
  report_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists verifications_property_idx on public.inventory_verifications (property_id);
create index if not exists reports_school_idx on public.generated_reports (school_id, created_at desc);

alter table public.inventory_verifications enable row level security;
alter table public.generated_reports enable row level security;

drop policy if exists "verifications select" on public.inventory_verifications;
create policy "verifications select" on public.inventory_verifications
  for select to authenticated
  using (exists (
    select 1 from public.properties p
    where p.id = property_id and public.is_school_member(p.school_id)
  ));

create policy "verifications insert" on public.inventory_verifications
  for insert to authenticated
  with check (
    public.current_role() = 'property_custodian'
    and exists (
      select 1 from public.properties p
      where p.id = property_id and public.is_school_member(p.school_id)
    )
  );

create policy "reports select" on public.generated_reports
  for select to authenticated
  using (public.is_school_member(school_id));

create policy "reports insert" on public.generated_reports
  for insert to authenticated
  with check (public.is_school_member(school_id) and created_by = auth.uid());

create policy "assignments update" on public.property_assignments
  for update to authenticated
  using (exists (
    select 1 from public.properties p
    where p.id = property_id and public.is_school_member(p.school_id)
      and public.current_role() in ('property_custodian', 'school_head')
  ));

revoke all on function public.current_profile() from public;
revoke all on function public.current_school_id() from public;
revoke all on function public.current_role() from public;
revoke all on function public.is_school_member(text) from public;
revoke all on function public.handle_new_user() from public;
grant execute on function public.current_profile() to authenticated;
grant execute on function public.current_school_id() to authenticated;
grant execute on function public.current_role() to authenticated;
grant execute on function public.is_school_member(text) to authenticated;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.properties to anon;
revoke select on public.properties from anon;

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if auth.uid() = old.id and public.current_role() is distinct from 'school_head' then
    new.role := old.role;
    new.active := old.active;
  end if;
  if public.current_role() is distinct from 'school_head' and auth.uid() is distinct from old.id then
    raise exception 'Not authorized';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields before update on public.profiles
for each row execute function public.protect_profile_fields();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  chosen_role text := coalesce(nullif(meta->>'role', ''), 'property_custodian');
  incoming_school text := nullif(meta->>'school_id', '');
  existing_head uuid;
  created_by_admin boolean := coalesce(meta->>'created_by_admin', '') = 'true';
begin
  if chosen_role not in ('school_head', 'property_custodian') then
    chosen_role := 'property_custodian';
  end if;

  if incoming_school is not null then
    select id into existing_head
    from public.profiles
    where school_id = incoming_school and role = 'school_head' and active = true
    limit 1;
  end if;

  if not created_by_admin then
    chosen_role := 'property_custodian';
  elsif chosen_role = 'school_head' and existing_head is not null then
    raise exception 'This school already has a School Head';
  end if;

  insert into public.profiles (
    id, first_name, middle_name, last_name, email, role,
    school_id, region_id, province_id, municipality_id, district_id, active
  ) values (
    new.id,
    coalesce(nullif(meta->>'first_name', ''), 'User'),
    coalesce(meta->>'middle_name', ''),
    coalesce(nullif(meta->>'last_name', ''), 'Account'),
    coalesce(new.email, ''),
    chosen_role,
    incoming_school,
    nullif(meta->>'region_id', ''),
    nullif(meta->>'province_id', ''),
    nullif(meta->>'municipality_id', ''),
    nullif(meta->>'district_id', ''),
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.public_property_by_qr(p_token text)
returns table (
  id uuid,
  entity_name text,
  ics_number text,
  inventory_item_number text,
  description text,
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

create unique index if not exists one_active_school_head
  on public.profiles (school_id)
  where role = 'school_head' and active = true and school_id is not null;
