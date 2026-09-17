-- Add Received From / Received By fields to properties.
-- Apply in the Supabase SQL editor.

alter table public.properties
  add column if not exists received_from_name text not null default '',
  add column if not exists received_from_position text not null default '',
  add column if not exists received_by_name text not null default '',
  add column if not exists received_by_position text not null default '';
