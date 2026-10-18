-- channel_messages: every inbound/outbound message (email, WhatsApp, SMS, phone).
-- attachments: files on a request. Also closes the circular reference with
-- service_requests.origin_message_id.

create table public.channel_messages (
  message_id           uuid primary key default gen_random_uuid(),
  channel              public.message_channel not null,
  direction            public.message_direction not null,
  external_message_id  text,
  from_address         text,
  to_address           text,
  subject              text,
  body                 text,
  raw_payload          jsonb,
  requester_id         uuid,
  service_request_id   uuid,
  processing_status    public.message_processing_status not null default 'received',
  handled_by_staff_id  uuid,
  received_at          timestamptz not null default now(),

  constraint fk_channel_messages_requester_id
    foreign key (requester_id) references public.requesters (requester_id)
    on delete restrict on update no action,

  constraint fk_channel_messages_service_request_id
    foreign key (service_request_id) references public.service_requests (service_request_id)
    on delete restrict on update no action,

  constraint fk_channel_messages_handled_by_staff_id
    foreign key (handled_by_staff_id) references public.staff (staff_id)
    on delete restrict on update no action
);
-- A redelivered provider message cannot create a duplicate (nulls allowed for manual phone logs).
create unique index uq_channel_messages_channel_external
  on public.channel_messages (channel, external_message_id) where external_message_id is not null;
create index idx_channel_messages_requester on public.channel_messages (requester_id) where requester_id is not null;
create index idx_channel_messages_request   on public.channel_messages (service_request_id) where service_request_id is not null;
create index idx_channel_messages_handled   on public.channel_messages (handled_by_staff_id) where handled_by_staff_id is not null;
-- Unprocessed inbox
create index idx_channel_messages_inbox on public.channel_messages (received_at desc) where service_request_id is null;

create trigger trg_channel_messages_block_delete before delete on public.channel_messages
  for each row execute function public.block_delete();

-- Close the circular reference (service_requests -> channel_messages).
alter table public.service_requests
  add constraint fk_service_requests_origin_message_id
    foreign key (origin_message_id) references public.channel_messages (message_id)
    on delete set null on update no action;

