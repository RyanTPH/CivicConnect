-- 002_identity.sql
-- requesters, staff, requester_contacts. No profiles table: each table points
-- straight at Supabase auth.users(id). Names live in these tables.
-- Roles: a person is a requester (row in requesters) and/or internal (row in staff);
-- staff.role sets the level. RLS is intentionally NOT enabled yet (PED: deferred).

-- ---------- requesters ----------
-- user_id is NULLABLE: people who phone, email or WhatsApp the municipality have no login.
create table public.requesters (
  requester_id uuid primary key default gen_random_uuid(),
  user_id      uuid,
  first_name   text not null,
  last_name    text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  deleted_by   uuid,

  constraint uq_requesters_user_id unique (user_id),
  constraint fk_requesters_user_id
    foreign key (user_id) references auth.users (id)
    on delete set null on update no action,
  constraint fk_requesters_deleted_by
    foreign key (deleted_by) references auth.users (id)
    on delete restrict on update no action,
  constraint ck_requesters_deleted_pair check (deleted_by is null or deleted_at is not null),
  constraint ck_requesters_first_name check (btrim(first_name) <> ''),
  constraint ck_requesters_last_name  check (btrim(last_name)  <> '')
);
create index idx_requesters_deleted_by on public.requesters (deleted_by) where deleted_by is not null;

-- ---------- staff (all internal users) ----------
create table public.staff (
  staff_id    uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  first_name  text not null,
  last_name   text not null,
  role        public.staff_role not null default 'staff',
  department  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  deleted_by  uuid,

  constraint uq_staff_user_id unique (user_id),
  constraint fk_staff_user_id
    foreign key (user_id) references auth.users (id)
    on delete restrict on update no action,
  constraint fk_staff_deleted_by
    foreign key (deleted_by) references auth.users (id)
    on delete restrict on update no action,
  constraint ck_staff_deleted_pair check (deleted_by is null or deleted_at is not null),
  constraint ck_staff_first_name check (btrim(first_name) <> ''),
  constraint ck_staff_last_name  check (btrim(last_name)  <> '')
);
create index idx_staff_deleted_by on public.staff (deleted_by) where deleted_by is not null;
create index idx_staff_current_role on public.staff (role) where deleted_at is null and is_active;

-- ---------- requester_contacts ----------
create table public.requester_contacts (
  contact_id    uuid primary key default gen_random_uuid(),
  requester_id  uuid not null,
  channel       public.contact_channel not null,
  address       text not null,
  is_verified   boolean not null default false,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  deleted_by    uuid,

  constraint fk_requester_contacts_requester_id
    foreign key (requester_id) references public.requesters (requester_id)
    on delete restrict on update no action,
  constraint fk_requester_contacts_deleted_by
    foreign key (deleted_by) references auth.users (id)
    on delete restrict on update no action,
  constraint ck_requester_contacts_deleted_pair check (deleted_by is null or deleted_at is not null),
  constraint ck_requester_contacts_address_not_blank
    check (btrim(address) <> '' and address = btrim(address)),
  constraint ck_requester_contacts_email_lowercase
    check (channel <> 'email' or address = lower(address))
);
-- Unique only among current rows, so a removed number can be added again.
create unique index uq_requester_contacts_channel_address
  on public.requester_contacts (channel, address) where deleted_at is null;
create index idx_requester_contacts_requester_id on public.requester_contacts (requester_id);
create index idx_requester_contacts_deleted_by on public.requester_contacts (deleted_by) where deleted_by is not null;

-- ---------- triggers ----------
create trigger trg_requesters_updated_at before update on public.requesters
  for each row execute function public.set_updated_at();
create trigger trg_staff_updated_at before update on public.staff
  for each row execute function public.set_updated_at();

create trigger trg_requesters_block_delete before delete on public.requesters
  for each row execute function public.block_delete();
create trigger trg_staff_block_delete before delete on public.staff
  for each row execute function public.block_delete();
create trigger trg_requester_contacts_block_delete before delete on public.requester_contacts
  for each row execute function public.block_delete();

-- ---------- views of current (not soft-deleted) people ----------
create view public.staff_current with (security_invoker = true) as
  select * from public.staff where deleted_at is null;
create view public.requesters_current with (security_invoker = true) as
  select * from public.requesters where deleted_at is null;

-- ---------- helpers for the logged-in staff member ----------
create or replace function public.current_staff_id()
returns uuid language sql stable security definer set search_path = public as $$
  select staff_id from public.staff
  where user_id = auth.uid() and is_active and deleted_at is null
$$;

create or replace function public.current_staff_role()
returns public.staff_role language sql stable security definer set search_path = public as $$
  select role from public.staff
  where user_id = auth.uid() and is_active and deleted_at is null
$$;
