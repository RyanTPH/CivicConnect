-- ---------------------------------------------------------------
-- system_administrators
-- ---------------------------------------------------------------
create table public.system_administrators (
  admin_id    uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  first_name  text not null,
  last_name   text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
   deleted_at  timestamptz null default null,
  constraint uq_system_administrators_user_id unique (user_id),
  constraint fk_system_administrators_user_id
    foreign key (user_id) references auth.users (id)
    on delete restrict on update no action,
  constraint ck_system_administrators_first_name check (btrim(first_name) <> ''),
  constraint ck_system_administrators_last_name  check (btrim(last_name)  <> '')
);
 
create trigger trg_system_administrators_updated_at
  before update on public.system_administrators
  for each row execute function public.set_updated_at();
 