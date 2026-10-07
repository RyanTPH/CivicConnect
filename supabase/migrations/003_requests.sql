-- The request lifecycle: service_requests, comments, request_status_history,
-- request_assignments, status_transitions.
-- origin_message_id is added WITHOUT its foreign key here; 004 adds it once
-- channel_messages exists (the two tables point at each other).

create table public.service_requests (
  service_request_id    uuid primary key default gen_random_uuid(),
  requester_id          uuid not null,
  assigned_staff_id     uuid,
  reference_number      text not null,
  title                 text not null,
  description           text not null,
  category              public.request_category not null,
  status                public.request_status   not null default 'Submitted',
  priority              public.request_priority not null default 'Medium',
  source_channel        public.source_channel   not null default 'web',
  captured_by_staff_id  uuid,
  origin_message_id     uuid,
  received_at           timestamptz not null default now(),
  due_at                timestamptz,
  resolved_at           timestamptz,
  closed_at             timestamptz,
  resolution_summary    text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint uq_service_requests_reference_number unique (reference_number),
  constraint fk_service_requests_requester_id
    foreign key (requester_id) references public.requesters (requester_id)
    on delete restrict on update no action,

  constraint fk_service_requests_assigned_staff_id
    foreign key (assigned_staff_id) references public.staff (staff_id)
    on delete restrict on update no action,

  constraint fk_service_requests_captured_by_staff_id
    foreign key (captured_by_staff_id) references public.staff (staff_id)
    on delete restrict on update no action,

  constraint ck_service_requests_reference check (btrim(reference_number) <> ''),

  constraint ck_service_requests_title check (btrim(title) <> ''),

  constraint ck_service_requests_description check (btrim(description) <> '')
);
create index idx_service_requests_requester_id      on public.service_requests (requester_id, created_at desc);
create index idx_service_requests_assigned_staff_id on public.service_requests (assigned_staff_id) where assigned_staff_id is not null;
create index idx_service_requests_captured_by       on public.service_requests (captured_by_staff_id) where captured_by_staff_id is not null;
create index idx_service_requests_origin_message    on public.service_requests (origin_message_id) where origin_message_id is not null;
create index idx_service_requests_status_priority   on public.service_requests (status, priority);
create index idx_service_requests_category          on public.service_requests (category);
create index idx_service_requests_due_open          on public.service_requests (due_at) where closed_at is null;

create table public.comments (
  comment_id          uuid primary key default gen_random_uuid(),
  service_request_id  uuid not null,
  author_user_id      uuid not null,
  comment_text        text not null,
  is_internal         boolean not null default false,
  date_created        timestamptz not null default now(),

  constraint fk_comments_service_request_id
    foreign key (service_request_id) references public.service_requests (service_request_id)
    on delete restrict on update no action,
  constraint fk_comments_author_user_id
    foreign key (author_user_id) references auth.users (id)
    on delete restrict on update no action,
  constraint ck_comments_text check (btrim(comment_text) <> '')
);
create index idx_comments_request on public.comments (service_request_id, date_created);
create index idx_comments_author  on public.comments (author_user_id);

create table public.request_status_history (
  request_status_history_id  uuid primary key default gen_random_uuid(),
  service_request_id         uuid not null,
  from_status                public.request_status,
  to_status                  public.request_status not null,
  changed_by_user_id         uuid,
  note                       text,
  changed_at                 timestamptz not null default now(),

  constraint fk_request_status_history_service_request_id
    foreign key (service_request_id) references public.service_requests (service_request_id)
    on delete restrict on update no action,

  constraint fk_request_status_history_changed_by_user_id
    foreign key (changed_by_user_id) references auth.users (id)
    on delete restrict on update no action
);
create index idx_status_history_request on public.request_status_history (service_request_id, changed_at);
create index idx_status_history_changed_by on public.request_status_history (changed_by_user_id) where changed_by_user_id is not null;

-- reason and unassigned_by_user_id are additions needed by the Assign / Unassign screen (UI-12).
create table public.request_assignments (
  assignment_id          uuid primary key default gen_random_uuid(),
  service_request_id     uuid not null,
  assigned_to_staff_id   uuid not null,
  assigned_by_user_id    uuid not null,
  assigned_at            timestamptz not null default now(),
  unassigned_at          timestamptz,
  unassigned_by_user_id  uuid,
  reason                 text,

  constraint fk_request_assignments_service_request_id
    foreign key (service_request_id) references public.service_requests (service_request_id)
    on delete restrict on update no action,

  constraint fk_request_assignments_assigned_to_staff_id
    foreign key (assigned_to_staff_id) references public.staff (staff_id)
    on delete restrict on update no action,

  constraint fk_request_assignments_assigned_by_user_id
    foreign key (assigned_by_user_id) references auth.users (id)
    on delete restrict on update no action,

  constraint fk_request_assignments_unassigned_by_user_id
    foreign key (unassigned_by_user_id) references auth.users (id)
    on delete restrict on update no action,

  constraint ck_request_assignments_dates check (unassigned_at is null or unassigned_at >= assigned_at)
);
-- A request has at most one CURRENT assignment.
create unique index uq_request_assignments_current
  on public.request_assignments (service_request_id) where unassigned_at is null;
create index idx_request_assignments_staff on public.request_assignments (assigned_to_staff_id, assigned_at desc);
create index idx_request_assignments_assigned_by on public.request_assignments (assigned_by_user_id);
create index idx_request_assignments_unassigned_by on public.request_assignments (unassigned_by_user_id) where unassigned_by_user_id is not null;

-- Which status may follow which, and who may make the move (drives UI-07, NFR-004).
create table public.status_transitions (
  from_status    public.request_status not null,
  to_status      public.request_status not null,
  allowed_roles  public.staff_role[]   not null,

  primary key (from_status, to_status),
  constraint ck_status_transitions_roles check (cardinality(allowed_roles) > 0),
  constraint ck_status_transitions_differ check (from_status <> to_status)
);

-- ---------- triggers ----------
create trigger trg_service_requests_updated_at before update on public.service_requests
  for each row execute function public.set_updated_at();

create trigger trg_service_requests_block_delete before delete on public.service_requests
  for each row execute function public.block_delete();

create trigger trg_comments_block_delete before delete on public.comments
  for each row execute function public.block_delete();

create trigger trg_status_history_block_delete before delete on public.request_status_history
  for each row execute function public.block_delete();
  
create trigger trg_request_assignments_block_delete before delete on public.request_assignments
  for each row execute function public.block_delete();

create trigger trg_comments_block_update before update on public.comments
  for each row execute function public.block_update();
create trigger trg_status_history_block_update before update on public.request_status_history
  for each row execute function public.block_update();