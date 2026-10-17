create table public.attachments (
  attachment_id       uuid primary key default gen_random_uuid(),
  service_request_id  uuid not null,
  message_id          uuid,
  file_name           text not null,
  storage_path        text not null,
  mime_type           text not null,
  size_bytes          integer not null,
  uploaded_by         uuid not null,
  uploaded_at         timestamptz not null default now(),
  deleted_at          timestamptz,
  deleted_by          uuid,

  constraint fk_attachments_service_request_id
    foreign key (service_request_id) references public.service_requests (service_request_id)
    on delete restrict on update no action,

  constraint fk_attachments_message_id
    foreign key (message_id) references public.channel_messages (message_id)
    on delete set null on update no action,

  constraint fk_attachments_uploaded_by
    foreign key (uploaded_by) references auth.users (id)
    on delete restrict on update no action,

  constraint fk_attachments_deleted_by
    foreign key (deleted_by) references auth.users (id)
    on delete restrict on update no action,

  constraint ck_attachments_deleted_pair check (deleted_by is null or deleted_at is not null),

  constraint ck_attachments_file_name check (btrim(file_name) <> ''),
  
  constraint ck_attachments_size check (size_bytes >= 0)
);
create index idx_attachments_request     on public.attachments (service_request_id) where deleted_at is null;
create index idx_attachments_message     on public.attachments (message_id) where message_id is not null;
create index idx_attachments_uploaded_by on public.attachments (uploaded_by);
create index idx_attachments_deleted_by  on public.attachments (deleted_by) where deleted_by is not null;

create trigger trg_attachments_block_delete before delete on public.attachments
  for each row execute function public.block_delete();