-- CivicConnect: recreate email-confirmed requester provisioning.
-- Exported from the working Supabase database on 2026-10-18.
-- Invited staff accounts are excluded by the trigger function itself.
-- Run using a migration role permitted to create auth.users triggers.

-- handle_confirmed_signup
CREATE OR REPLACE FUNCTION public.handle_confirmed_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_email       text;
  v_first       text;
  v_last        text;
  v_contact     record;
  v_has_contact boolean;
  v_can_link    boolean;
begin
  -- Staff invited by an admin are not residents (the add-staff function sends
  -- those invites, and Supabase stamps invited_at on them). Skip them. A staff
  -- member who also needs to submit requests gets a requesters row on purpose,
  -- later, not automatically. Also skip logins with no email (anonymous).
  if new.invited_at is not null or new.email is null then
    return new;
  end if;

  -- Already has a requester row (trigger ran before): nothing to do.
  if exists (select 1 from public.requesters r where r.user_id = new.id) then
    return new;
  end if;

  v_email := lower(btrim(new.email));

  -- Names come from sign-up metadata. Users can edit their own metadata, which
  -- is fine for their own display name. If a name is missing (for example a
  -- social sign-in), fall back so the sign-up never fails over it.
  v_first := coalesce(
    left(nullif(btrim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), ''), 100),
    split_part(v_email, '@', 1)
  );
  v_last := coalesce(
    left(nullif(btrim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), ''), 100),
    ''
  );

  -- Did staff already capture this person under the same email?
  -- (A soft-deleted requester's contact can still hold the email, so look at it
  -- too: otherwise the insert below would hit the unique key and fail.)
  select c.contact_id, c.requester_id,
         r.user_id as owner_user_id, r.deleted_at as owner_deleted_at
    into v_contact
    from public.requester_contacts c
    join public.requesters r on r.requester_id = c.requester_id
   where c.channel = 'email'
     and c.address = v_email
     and c.deleted_at is null
   limit 1;
  v_has_contact := found;
  v_can_link := v_has_contact
            and v_contact.owner_user_id is null
            and v_contact.owner_deleted_at is null;

  if v_can_link then
    -- Yes, and they have no login yet: attach this login to that requester so
    -- their request history is kept. The email is confirmed, so mark it verified.
    update public.requesters
       set user_id = new.id,
           updated_at = now()
     where requester_id = v_contact.requester_id;

    update public.requester_contacts
       set is_verified = true
     where contact_id = v_contact.contact_id;

  elsif v_has_contact then
    -- The email is already tied to a requester with a DIFFERENT login, or to
    -- one that was soft-deleted. Don't steal it, and don't violate the unique
    -- (channel, address) key. Create this person's requester row without the
    -- email contact.
    insert into public.requesters
      (requester_id, user_id, first_name, last_name, created_at, updated_at)
    values (gen_random_uuid(), new.id, v_first, v_last, now(), now());

  else
    -- Brand-new requester.
    insert into public.requesters
      (requester_id, user_id, first_name, last_name, created_at, updated_at)
    values (gen_random_uuid(), new.id, v_first, v_last, now(), now());

    -- channel is the enum contact_channel; the explicit cast keeps this working
    -- even if the INSERT is ever rewritten in a form that doesn't coerce literals.
    insert into public.requester_contacts
      (contact_id, requester_id, channel, address, is_verified, created_at)
    select gen_random_uuid(), r.requester_id, 'email'::public.contact_channel,
           v_email, true, now()
      from public.requesters r
     where r.user_id = new.id;
  end if;

  return new;
end;
$function$;

-- Trigger functions are not intended to be called as API RPCs.
REVOKE ALL ON FUNCTION public.handle_confirmed_signup() FROM PUBLIC, anon, authenticated;

-- Re-running this migration should not duplicate hooks.
DROP TRIGGER IF EXISTS on_auth_user_created_confirmed ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;

-- on_auth_user_created_confirmed
CREATE TRIGGER on_auth_user_created_confirmed AFTER INSERT ON auth.users FOR EACH ROW WHEN ((new.email_confirmed_at IS NOT NULL)) EXECUTE FUNCTION public.handle_confirmed_signup();

-- on_auth_user_email_confirmed
CREATE TRIGGER on_auth_user_email_confirmed AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW WHEN (((old.email_confirmed_at IS NULL) AND (new.email_confirmed_at IS NOT NULL))) EXECUTE FUNCTION public.handle_confirmed_signup();

