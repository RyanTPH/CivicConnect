-- ---------------------------------------------------------------
-- requester_contacts
-- One row per way of reaching a requester. An inbound email or
-- WhatsApp number is matched to a requester through (channel, address).
-- ---------------------------------------------------------------
create table public.requester_contacts (
  contact_id    uuid primary key default gen_random_uuid(),
  requester_id  uuid not null,
  channel       text not null,
  address       text not null,
  is_verified   boolean not null default false,
  created_at    timestamptz not null default now(),
deleted_at      timestamptz  null default null
  constraint fk_requester_contacts_requester_id
    foreign key (requester_id) references public.requesters (requester_id)
    on delete cascade on update no action,
  constraint ck_requester_contacts_channel
    check (channel in ('email', 'sms', 'whatsapp', 'phone')),
  constraint ck_requester_contacts_address_not_blank
    check (btrim(address) <> '' and address = btrim(address)),
  constraint ck_requester_contacts_email_lowercase
    check (channel <> 'email' or address = lower(address)),
  constraint uq_requester_contacts_channel_address unique (channel, address)
);