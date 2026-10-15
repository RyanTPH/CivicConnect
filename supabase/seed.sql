-- supabase/seed.sql  --  DEVELOPMENT / STAGING TEST DATA ONLY. NEVER RUN ON PRODUCTION.
--
-- Runs automatically after the migrations on `supabase db reset` (needs Docker).
-- Without Docker, paste it into the Supabase SQL Editor of your DEV project, once,
-- AFTER the migrations. It is not run by `supabase db push`.
--
-- WARNING: it creates real login accounts with a known password (Password123!).
-- Use only on a project that holds no real data. Rows cannot be deleted afterwards
-- (delete is blocked by design), so to start over, recreate the dev database.
--
-- All fake people use the @civicconnect.test domain and the +2782/83/84/85 test numbers.
-- Attachment rows describe files that are NOT actually in Supabase Storage.

create or replace function pg_temp.act_as(p_user uuid)
returns void language plpgsql as $$
begin
  -- Makes auth.uid() return this user so triggers and functions record the right actor.
  perform set_config('request.jwt.claim.sub',   coalesce(p_user::text, ''), false);
  perform set_config('request.jwt.claims',
                     case when p_user is null then '' else json_build_object('sub', p_user)::text end, false);
end;
$$;

select pg_temp.act_as(null);   -- start as "system"

-- =====================================================================
-- 1. Logins (auth.users + auth.identities)  password for all: Password123!
-- =====================================================================
with u(id, email) as (values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'admin@civicconnect.test'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'manager@civicconnect.test'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'supervisor@civicconnect.test'),
  ('a0000000-0000-0000-0000-000000000004'::uuid, 'thandi.nkosi@civicconnect.test'),
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'pieter.vanwyk@civicconnect.test'),
  ('a0000000-0000-0000-0000-000000000006'::uuid, 'lerato.molefe@civicconnect.test'),
  ('a0000000-0000-0000-0000-000000000007'::uuid, 'sipho.dlamini@civicconnect.test'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'rita.pillay@civicconnect.test'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'ahmed.hassan@civicconnect.test'),
  ('b0000000-0000-0000-0000-000000000003'::uuid, 'nomsa.zulu@civicconnect.test'))
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
       extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
       '', '', '', ''
from u;

insert into auth.identities
  (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text,
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users where email like '%@civicconnect.test';

-- =====================================================================
-- 2. Staff (all internal users; role sets the level)
-- =====================================================================
insert into public.staff (staff_id, user_id, first_name, last_name, role, department, is_active) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Nomvula', 'Admin',    'admin',      'IT Support', true),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Kagiso',  'Mokoena',  'manager',    'Management', true),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Zanele',  'Khumalo',  'supervisor', 'Operations', true),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'Thandi',  'Nkosi',    'staff',      'Roads',      true),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'Pieter',  'van Wyk',  'staff',      'Water',      true),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 'Lerato',  'Molefe',   'staff',      'Waste',      false),  -- on leave
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000007', 'Sipho',   'Dlamini',  'staff',      'Electricity',true);   -- soft-deleted later

-- =====================================================================
-- 3. Requesters (three with logins, two without, one staff member who is also a resident)
-- =====================================================================
insert into public.requesters (requester_id, user_id, first_name, last_name) values
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Rita',   'Pillay'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Ahmed',  'Hassan'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'Nomsa',  'Zulu'),
  ('d0000000-0000-0000-0000-000000000004', null,                                   'Johan',  'Botha'),   -- phoned in, no login
  ('d0000000-0000-0000-0000-000000000005', null,                                   'Mary',   'Dlamini'), -- WhatsApp, no login
  ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000004', 'Thandi', 'Nkosi');     -- staff who is also a resident

insert into public.requester_contacts (requester_id, channel, address, is_verified) values
  ('d0000000-0000-0000-0000-000000000001', 'email',    'rita.pillay@civicconnect.test',   true),
  ('d0000000-0000-0000-0000-000000000001', 'whatsapp', '+27821110001',                    true),
  ('d0000000-0000-0000-0000-000000000002', 'email',    'ahmed.hassan@civicconnect.test',  true),
  ('d0000000-0000-0000-0000-000000000003', 'email',    'nomsa.zulu@civicconnect.test',    true),
  ('d0000000-0000-0000-0000-000000000003', 'sms',      '+27854440004',                    false),
  ('d0000000-0000-0000-0000-000000000004', 'phone',    '+27832220002',                    true),
  ('d0000000-0000-0000-0000-000000000005', 'whatsapp', '+27843330003',                    true),
  ('d0000000-0000-0000-0000-000000000005', 'whatsapp', '+27843330099',                    false);  -- old number, removed below

-- =====================================================================
-- 4. Channel messages (service_request_id is linked after the requests exist)
-- =====================================================================
insert into public.channel_messages
  (message_id, channel, direction, external_message_id, from_address, to_address, subject, body,
   raw_payload, requester_id, processing_status, handled_by_staff_id, received_at) values
  ('f0000000-0000-0000-0000-000000000001', 'phone',    'inbound',  null, '+27832220002', null, null,
   'Caller reports illegal dumping behind the community hall on Church Street.',
   null, 'd0000000-0000-0000-0000-000000000004', 'converted', 'c0000000-0000-0000-0000-000000000004', now() - interval '4 days'),
  ('f0000000-0000-0000-0000-000000000002', 'whatsapp', 'inbound',  'wamid.SEED0001', '+27843330003', '+27800000000', null,
   'The swing at Rose Park is broken and the chain is hanging loose. Children could get hurt.',
   '{"type":"text","note":"seed example payload"}'::jsonb, 'd0000000-0000-0000-0000-000000000005', 'converted', 'c0000000-0000-0000-0000-000000000005', now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000000003', 'whatsapp', 'outbound', null, '+27800000000', '+27843330003', null,
   'Thank you. Your request CC-2026-0006 has been logged. We will update you here.',
   null, 'd0000000-0000-0000-0000-000000000005', 'converted', 'c0000000-0000-0000-0000-000000000005', now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000000004', 'email',    'inbound',  'mail.SEED0004', 'unknown.sender@example.test', 'help@civicconnect.test', 'Water outage in our street',
   'There has been no water since this morning. Can someone please check?',
   null, null, 'received', null, now() - interval '3 hours'),                       -- unprocessed inbox item
  ('f0000000-0000-0000-0000-000000000005', 'email',    'inbound',  'mail.SEED0005', 'ahmed.hassan@civicconnect.test', 'help@civicconnect.test', 'Re: smell from the drain',
   'Sending this again in case the first one did not arrive.',
   null, 'd0000000-0000-0000-0000-000000000002', 'duplicate', 'c0000000-0000-0000-0000-000000000004', now() - interval '6 days');

-- =====================================================================
-- 5. Service requests  (submitted as the requester or the capturing staff member)
-- =====================================================================
select pg_temp.act_as('b0000000-0000-0000-0000-000000000001');   -- Rita
insert into public.service_requests
  (service_request_id, requester_id, reference_number, title, description, category, priority, source_channel, received_at, due_at, created_at) values
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'CC-2026-0001', 'Pothole on Main Street',
   'Large pothole outside number 42 Main Street, damaging tyres.', 'Roads and Transport', 'High', 'web',
   now() - interval '14 days', now() - interval '7 days', now() - interval '14 days'),
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'CC-2026-0004', 'Refuse not collected',
   'Our street was skipped on collection day for two weeks.', 'Waste Management', 'Low', 'web',
   now() - interval '5 days', now() + interval '3 days', now() - interval '5 days');

select pg_temp.act_as('b0000000-0000-0000-0000-000000000002');   -- Ahmed
insert into public.service_requests
  (service_request_id, requester_id, reference_number, title, description, category, priority, source_channel, received_at, due_at, created_at) values
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'CC-2026-0002', 'Burst water pipe',
   'Water is flowing onto the road from a burst pipe near the corner shop.', 'Water and Sanitation', 'High', 'web',
   now() - interval '9 days', now() - interval '2 days', now() - interval '9 days'),
  ('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000002', 'CC-2026-0007', 'Sewage smell from drain',
   'A strong sewage smell comes from the drain outside our building.', 'Water and Sanitation', 'Medium', 'email',
   now() - interval '6 days', null, now() - interval '6 days');

select pg_temp.act_as('b0000000-0000-0000-0000-000000000003');   -- Nomsa
insert into public.service_requests
  (service_request_id, requester_id, reference_number, title, description, category, priority, source_channel, received_at, due_at, created_at) values
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'CC-2026-0003', 'Streetlight not working',
   'The streetlight on Oak Avenue has been out for a week.', 'Electricity', 'Medium', 'web',
   now() - interval '2 days', now() + interval '5 days', now() - interval '2 days'),
  ('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000003', 'CC-2026-0008', 'Traffic light malfunction',
   'The traffic light at Oak and Church flashes red in all directions.', 'Roads and Transport', 'High', 'web',
   now() - interval '8 days', now() - interval '1 day', now() - interval '8 days');

select pg_temp.act_as('a0000000-0000-0000-0000-000000000004');   -- Thandi logs a phone call
insert into public.service_requests
  (service_request_id, requester_id, reference_number, title, description, category, priority, source_channel,
   captured_by_staff_id, origin_message_id, received_at, due_at, created_at) values
  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000004', 'CC-2026-0005', 'Illegal dumping behind hall',
   'Building rubble and household waste dumped behind the community hall on Church Street.', 'Waste Management', 'Medium', 'phone',
   'c0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000001',
   now() - interval '4 days', now() + interval '7 days', now() - interval '4 days');

select pg_temp.act_as('a0000000-0000-0000-0000-000000000005');   -- Pieter converts a WhatsApp message
insert into public.service_requests
  (service_request_id, requester_id, reference_number, title, description, category, priority, source_channel,
   captured_by_staff_id, origin_message_id, received_at, due_at, created_at) values
  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000005', 'CC-2026-0006', 'Broken swing at Rose Park',
   'The swing chain is broken and hanging loose; a safety risk for children.', 'Other', 'Medium', 'whatsapp',
   'c0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000002',
   now() - interval '1 day', now() + interval '10 days', now() - interval '1 day');

select pg_temp.act_as(null);
update public.channel_messages set service_request_id = 'e0000000-0000-0000-0000-000000000005' where message_id = 'f0000000-0000-0000-0000-000000000001';
update public.channel_messages set service_request_id = 'e0000000-0000-0000-0000-000000000006' where message_id in ('f0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000003');
update public.channel_messages set service_request_id = 'e0000000-0000-0000-0000-000000000007' where message_id = 'f0000000-0000-0000-0000-000000000005';

-- =====================================================================
-- 6. Attachments (rows only; no real files in Storage)
-- =====================================================================
insert into public.attachments
  (attachment_id, service_request_id, message_id, file_name, storage_path, mime_type, size_bytes, uploaded_by) values
  ('90000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', null,
   'pothole.jpg', 'requests/e0000000-0000-0000-0000-000000000001/pothole.jpg', 'image/jpeg', 241664, 'b0000000-0000-0000-0000-000000000001'),
  ('90000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', null,
   'wrong_photo.jpg', 'requests/e0000000-0000-0000-0000-000000000001/wrong_photo.jpg', 'image/jpeg', 98304, 'b0000000-0000-0000-0000-000000000001'),
  ('90000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000002',
   'swing_photo.jpg', 'requests/e0000000-0000-0000-0000-000000000006/swing_photo.jpg', 'image/jpeg', 184320, 'a0000000-0000-0000-0000-000000000005');

-- =====================================================================
-- 7. Workflow, using the real functions so history and assignments are consistent
-- =====================================================================
-- CC-0001: full lifecycle, Submitted -> Accepted -> In Progress -> Resolved -> Closed
select pg_temp.act_as('a0000000-0000-0000-0000-000000000004');   -- Thandi
select public.assign_request       ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Roads team');
select public.change_request_status('e0000000-0000-0000-0000-000000000001', 'Accepted',    'Reviewed and accepted');
select public.change_request_status('e0000000-0000-0000-0000-000000000001', 'In Progress', 'Crew scheduled');
select public.change_request_status('e0000000-0000-0000-0000-000000000001', 'Resolved',    'Pothole filled');
update public.service_requests
  set resolution_summary = 'Pothole filled and sealed by the roads crew.'
  where service_request_id = 'e0000000-0000-0000-0000-000000000001';
select public.change_request_status('e0000000-0000-0000-0000-000000000001', 'Closed',      'Confirmed with requester');

-- CC-0004: accepted, waiting to be assigned
select public.change_request_status('e0000000-0000-0000-0000-000000000004', 'Accepted', 'Added to the collection backlog');

-- CC-0007: rejected as a duplicate, then closed by the supervisor
select public.change_request_status('e0000000-0000-0000-0000-000000000007', 'Rejected', 'Duplicate of CC-2026-0002');

-- CC-0002: in progress and overdue
select pg_temp.act_as('a0000000-0000-0000-0000-000000000005');   -- Pieter
select public.change_request_status('e0000000-0000-0000-0000-000000000002', 'Accepted',    'Water team notified');
select public.assign_request       ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000005');
select public.change_request_status('e0000000-0000-0000-0000-000000000002', 'In Progress', 'Waiting for a replacement valve');

-- CC-0005: supervisor accepts and assigns to Pieter, who starts work
select pg_temp.act_as('a0000000-0000-0000-0000-000000000003');   -- Zanele (supervisor)
select public.change_request_status('e0000000-0000-0000-0000-000000000005', 'Accepted', 'Logged from phone call');
select public.assign_request       ('e0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', 'Closest available team');
select public.change_request_status('e0000000-0000-0000-0000-000000000007', 'Closed',   'Duplicate closed');
select pg_temp.act_as('a0000000-0000-0000-0000-000000000005');
select public.change_request_status('e0000000-0000-0000-0000-000000000005', 'In Progress', 'Site visit done');

-- CC-0008: Sipho works it, then leaves; the supervisor reassigns it (history keeps his name)
select pg_temp.act_as('a0000000-0000-0000-0000-000000000007');   -- Sipho
select public.change_request_status('e0000000-0000-0000-0000-000000000008', 'Accepted',    'Electrical fault suspected');
select public.assign_request       ('e0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000007');
select public.change_request_status('e0000000-0000-0000-0000-000000000008', 'In Progress', 'Controller unit ordered');

select pg_temp.act_as('a0000000-0000-0000-0000-000000000001');   -- Admin soft-deletes Sipho and blocks his login
update public.staff
  set deleted_at = now(), deleted_by = 'a0000000-0000-0000-0000-000000000001', is_active = false
  where staff_id = 'c0000000-0000-0000-0000-000000000007';
update auth.users set banned_until = '2999-12-31' where id = 'a0000000-0000-0000-0000-000000000007';
-- admin also removes Mary's old number and a wrong attachment
update public.requester_contacts
  set deleted_at = now(), deleted_by = 'a0000000-0000-0000-0000-000000000001'
  where address = '+27843330099';

select pg_temp.act_as('a0000000-0000-0000-0000-000000000003');   -- supervisor
select public.unassign_request('e0000000-0000-0000-0000-000000000008', 'Staff member left the organisation');
select public.assign_request  ('e0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000004', 'Reassigned after departure');
update public.attachments
  set deleted_at = now(), deleted_by = 'a0000000-0000-0000-0000-000000000003'
  where attachment_id = '90000000-0000-0000-0000-000000000002';

select pg_temp.act_as(null);

-- =====================================================================
-- 8. Comments and notifications
-- =====================================================================
insert into public.comments (service_request_id, author_user_id, comment_text, is_internal) values
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'A repair crew is booked for Thursday.',                false),
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'Needs two bags of cold-mix asphalt from the depot.',   true),
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Thank you, the road is much safer now.',               false),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'The valve is on order and should arrive tomorrow.',    false),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Water is still running, please hurry.',                false),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Overdue. Escalate to the water manager.',              true),
  ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'Check whether the site needs a skip bin.',             true),
  ('e0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000004', 'This matches CC-2026-0002, so we are tracking it there.', false);

insert into public.notifications
  (recipient_user_id, service_request_id, event_type, status_snapshot, channel, delivery_status, read_at) values
  ('b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'closed',   'Closed',      'in_app', 'sent', now()),
  ('b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 'accepted', 'Accepted',    'in_app', 'sent', null),
  ('b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'updated',  'In Progress', 'in_app', 'sent', null),
  ('b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000007', 'rejected', 'Rejected',    'in_app', 'sent', null);

select pg_temp.act_as(null);
