-- ---------- audit_log ----------
create table public.audit_log (
  audit_id            bigint generated always as identity primary key,
  occurred_at         timestamptz not null default now(),
  actor_user_id       uuid,
  actor_type          public.audit_actor_type not null,
  action              text not null,
  entity_type         text not null,
  entity_id           uuid,
  service_request_id  uuid,
  old_values          jsonb,
  new_values          jsonb,
  correlation_id      uuid,

  constraint fk_audit_log_actor_user_id
    foreign key (actor_user_id) references auth.users (id)
    on delete restrict on update no action,
  constraint fk_audit_log_service_request_id
    foreign key (service_request_id) references public.service_requests (service_request_id)
    on delete restrict on update no action,
  constraint ck_audit_log_action check (action in ('insert', 'update', 'delete', 'login'))
);
create index idx_audit_log_entity  on public.audit_log (entity_type, entity_id, occurred_at);
create index idx_audit_log_request on public.audit_log (service_request_id, occurred_at) where service_request_id is not null;
create index idx_audit_log_actor   on public.audit_log (actor_user_id, occurred_at) where actor_user_id is not null;

-- Append-only: nobody can change or remove rows, including privileged roles.
create trigger trg_audit_log_block_update before update on public.audit_log
  for each row execute function public.block_update();
create trigger trg_audit_log_block_delete before delete on public.audit_log
  for each row execute function public.block_delete();
create trigger trg_audit_log_block_truncate before truncate on public.audit_log
  for each statement execute function public.block_update();

-- Only the audit trigger function (SECURITY DEFINER, owned by the migration role) may insert.
revoke all on public.audit_log from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.audit_log from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke insert, update, delete, truncate on public.audit_log from authenticated;
    grant select on public.audit_log to authenticated;  -- narrowed by RLS later
  end if;
end $$;

-- ---------- generic audit trigger ----------

create trigger trg_audit_requesters         after insert or update or delete on public.requesters
  for each row execute function public.audit_row('requester_id');

create trigger trg_audit_staff              after insert or update or delete on public.staff
  for each row execute function public.audit_row('staff_id');

create trigger trg_audit_requester_contacts after insert or update or delete on public.requester_contacts
  for each row execute function public.audit_row('contact_id');

create trigger trg_audit_service_requests   after insert or update or delete on public.service_requests
  for each row execute function public.audit_row('service_request_id');

create trigger trg_audit_comments           after insert or update or delete on public.comments
  for each row execute function public.audit_row('comment_id');

create trigger trg_audit_status_history     after insert or update or delete on public.request_status_history
  for each row execute function public.audit_row('request_status_history_id');

create trigger trg_audit_request_assignments after insert or update or delete on public.request_assignments
  for each row execute function public.audit_row('assignment_id');

create trigger trg_audit_attachments        after insert or update or delete on public.attachments
  for each row execute function public.audit_row('attachment_id');
  
create trigger trg_audit_channel_messages   after insert or update or delete on public.channel_messages
  for each row execute function public.audit_row('message_id');