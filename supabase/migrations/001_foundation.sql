
-- Shared types and helper functions used by every later migration.
-- Provisional lists (categories, statuses, priorities) are domains, so each
-- list lives in ONE place and can be changed with ALTER DOMAIN.

-- ---------- enums for stable technical lists ----------
create type public.staff_role              as enum ('staff', 'supervisor', 'manager', 'admin');
create type public.contact_channel         as enum ('email', 'sms', 'whatsapp', 'phone');
create type public.source_channel          as enum ('web', 'email', 'whatsapp', 'sms', 'phone', 'walk_in', 'other');
create type public.message_channel         as enum ('email', 'sms', 'whatsapp', 'phone', 'other');
create type public.message_direction       as enum ('inbound', 'outbound');
create type public.message_processing_status as enum ('received', 'matched', 'converted', 'duplicate', 'rejected');
create type public.notification_event      as enum ('accepted', 'rejected', 'updated', 'resolved', 'closed');
create type public.notification_channel    as enum ('in_app', 'email', 'sms', 'whatsapp');
create type public.delivery_status         as enum ('pending', 'sent', 'failed');
create type public.audit_actor_type        as enum ('user', 'system', 'channel_integration');

-- ---------- domains for lists still to be confirmed with the organisation ----------
-- PROVISIONAL: categories (ASM-002), statuses (ASM-003), priorities. Confirm, then
-- change with: alter domain public.request_status drop constraint ...; add constraint ...
create domain public.request_category as text
  constraint ck_request_category check (value in
    ('Water and Sanitation', 'Roads and Transport', 'Electricity',
     'Waste Management', 'Public Safety', 'Other'));

create domain public.request_status as text
  constraint ck_request_status check (value in
    ('Submitted', 'Accepted', 'In Progress', 'Resolved', 'Closed', 'Rejected'));

create domain public.request_priority as text
  constraint ck_request_priority check (value in ('Low', 'Medium', 'High'));

-- ---------- helper trigger functions ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Soft-delete / immutability guards: attach to tables that must never lose rows.
create or replace function public.block_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'Rows in % cannot be deleted; use the soft-delete columns or a status change instead', tg_table_name
    using errcode = '42501';
end;
$$;

create or replace function public.block_update()
returns trigger language plpgsql as $$
begin
  raise exception '% is append-only; rows cannot be changed', tg_table_name
    using errcode = '42501';
end;
$$;
