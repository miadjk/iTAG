-- Add Semi-Expendable / Consumable classifications and type/code columns.
-- Apply in the Supabase SQL editor after deploying the app that uses these fields.

alter table public.properties
  add column if not exists type text not null default '',
  add column if not exists code text not null default '';

alter table public.properties drop constraint if exists properties_classification_check;

alter table public.properties
  add constraint properties_classification_check
  check (classification in ('low_value', 'high_value', 'semi_expendable', 'consumable'));
