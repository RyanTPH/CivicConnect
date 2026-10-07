
-- notifications (UI-08) and the append-only audit_log written by triggers (NFR-009).

create table public.notifications (
  notification_id     uuid primary key default gen_random_uuid(),
  recipient_user_id   uuid not null,
  service_request_id  uuid not null,
  event_type          public.notification_event not null,
  status_snapshot     text,
  channel             public.notification_channel not null default 'in_app',
  delivery_status     public.delivery_status not null default 'pending',
  created_at          timestamptz not null default now(),
  read_at             timestamptz,

  constraint fk_notifications_recipient_user_id
    foreign key (recipient_user_id) references auth.users (id)
    on delete cascade on update no action,
  constraint fk_notifications_service_request_id
    foreign key (service_request_id) references public.service_requests (service_request_id)
    on delete restrict on update no action
);
create index idx_notifications_recipient on public.notifications (recipient_user_id, created_at desc);
create index idx_notifications_unread    on public.notifications (recipient_user_id) where read_at is null;
create index idx_notifications_request   on public.notifications (service_request_id);

