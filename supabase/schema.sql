-- iTAG-PROP schema for Supabase
-- Run in the SQL editor after creating a project.
-- The PWA currently persists locally so it can run without keys.
-- Connect this schema when deploying with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  first_name text not null,
  middle_name text default '',
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
  entity_name text,
  fund_cluster text,
  ics_number text,
  inventory_item_number text,
  property_number text not null,
  description text not null,
  quantity numeric not null default 1,
  unit_of_measure text,
  date_acquired date,
  acquisition_reference text,
  unit_cost numeric default 0,
  total_cost numeric default 0,
  fund_source text,
  custodian_last_user text,
  current_accountable_person text,
  office_department text,
  location text,
  estimated_useful_life text,
  condition text,
  status text,
  remarks text,
  brand text,
  model text,
  serial_number text,
  warranty text,
  qr_code text unique,
  excel_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_qr_codes (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  qr_payload text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.property_assignments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  accountable_person text not null,
  office_department text,
  location text,
  date_assigned date,
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
  reason text,
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
  description text,
  unit text,
  current_quantity numeric not null default 0,
  minimum_stock_level numeric not null default 0,
  location text,
  status text not null,
  remarks text,
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
  reference text,
  recipient text,
  purpose text,
  performed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_verifications (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  verified_by uuid references public.profiles(id),
  date date,
  location text,
  accountable_person text,
  condition text,
  status text,
  existence_confirmed boolean not null default true,
  verification_status text,
  remarks text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
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

create table if not exists public.generated_forms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_qr_codes enable row level security;
alter table public.property_assignments enable row level security;
alter table public.property_transfers enable row level security;
alter table public.property_history enable row level security;
alter table public.consumable_supplies enable row level security;
alter table public.stock_transactions enable row level security;
alter table public.inventory_verifications enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.generated_forms enable row level security;

create policy "authenticated read own school data" on public.profiles
  for select using (auth.uid() = auth_user_id or auth.role() = 'authenticated');
