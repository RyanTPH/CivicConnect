-- CivicConnect: identity tables (no profiles table)
-- Each role has its own table that points straight at Supabase auth.users.
-- A person's role is the table they have a row in.
-- RLS is intentionally NOT enabled here (PED: deferred until auth is stable).
 

 
-- ---------------------------------------------------------------
-- requesters
-- user_id is NULLABLE: people who phone, email or WhatsApp the
-- municipality have no login but still need a requester record.
-- ---------------------------------------------------------------
create table public.requesters (
  requester_id uuid primary key default gen_random_uuid(),
  user_id      uuid,
  first_name   text not null,
  last_name    text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
    deleted_at  timestamptz null default null,

 
  constraint uq_requesters_user_id unique (user_id),
  constraint fk_requesters_user_id
    foreign key (user_id) references auth.users (id)
    on delete set null on update no action,
  constraint ck_requesters_first_name check (btrim(first_name) <> ''),
  constraint ck_requesters_last_name  check (btrim(last_name)  <> '')
);
 
create trigger trg_requesters_updated_at
  before update on public.requesters
  for each row execute function public.set_updated_at();