
-- ---------------------------------------------------------------
-- staff
-- ---------------------------------------------------------------
create table public.staff (
  staff_id    uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  first_name  text not null,
  last_name   text not null,
  department  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz null default null,
 
  constraint uq_staff_user_id unique (user_id),
  constraint fk_staff_user_id
    foreign key (user_id) references auth.users (id)
    on delete restrict on update no action,
  constraint ck_staff_first_name check (btrim(first_name) <> ''),
  constraint ck_staff_last_name  check (btrim(last_name)  <> '')
);
 
create trigger trg_staff_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();