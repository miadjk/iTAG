-- Apply in the Supabase SQL editor if the live database was already initialized.
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

create unique index if not exists one_active_school_head
  on public.profiles (school_id)
  where role = 'school_head' and active = true and school_id is not null;
