-- CivicConnect Milestone 3: staff assignment and status workflow RPCs.
-- Captured from the tested Supabase staging functions on 2026-10-15.
-- Requires public.staff, public.staff_role, tables created by earlier migrations,
-- and auth.uid(). The staff helper functions are defined below.
-- NOTE: Preserve staging's current legacy supervisor permissions; review separately.
-- SECURITY DEFINER function ownership and search_path should receive security review.

-- Active staff identity helpers, exported from staging.
CREATE OR REPLACE FUNCTION public.current_staff_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select staff_id from public.staff
  where user_id = auth.uid() and is_active and deleted_at is null
$function$;

CREATE OR REPLACE FUNCTION public.current_staff_role()
 RETURNS staff_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select role from public.staff
  where user_id = auth.uid() and is_active and deleted_at is null
$function$;

-- Only authenticated users may call these helper functions.
REVOKE ALL ON FUNCTION public.current_staff_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_staff_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_staff_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_staff_role() TO authenticated;

-- assign_request
CREATE OR REPLACE FUNCTION public.assign_request(p_request_id uuid, p_staff_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role    public.staff_role := public.current_staff_role();
  v_self    uuid              := public.current_staff_id();
  v_status  public.request_status;
begin
  if v_role is null then
    raise exception 'Only active staff can assign requests' using errcode = '42501';
  end if;
  if v_role = 'staff' and p_staff_id is distinct from v_self then
    raise exception 'Only supervisors, managers and admins can assign other staff' using errcode = '42501';
  end if;
  if not exists (select 1 from public.staff
                 where staff_id = p_staff_id and is_active and deleted_at is null) then
    raise exception 'The selected staff member is not active' using errcode = '22023';
  end if;

  select status into v_status
  from public.service_requests
  where service_request_id = p_request_id
  for update;
  if not found then
    raise exception 'Request % not found', p_request_id using errcode = 'P0002';
  end if;
  if v_status in ('Closed', 'Rejected') then
    raise exception 'A % request cannot be assigned', v_status using errcode = '22023';
  end if;

  update public.request_assignments
  set unassigned_at = now(), unassigned_by_user_id = auth.uid()
  where service_request_id = p_request_id and unassigned_at is null;

  insert into public.request_assignments
    (service_request_id, assigned_to_staff_id, assigned_by_user_id, reason)
  values (p_request_id, p_staff_id, auth.uid(), p_reason);

  update public.service_requests
  set assigned_staff_id = p_staff_id
  where service_request_id = p_request_id;
end;
$function$;

-- unassign_request
CREATE OR REPLACE FUNCTION public.unassign_request(p_request_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role  public.staff_role := public.current_staff_role();
  v_rows  integer;
begin
  if v_role is null or v_role = 'staff' then
    raise exception 'Only supervisors, managers and admins can unassign requests' using errcode = '42501';
  end if;

  perform 1 from public.service_requests where service_request_id = p_request_id for update;
  if not found then
    raise exception 'Request % not found', p_request_id using errcode = 'P0002';
  end if;

  update public.request_assignments
  set unassigned_at = now(), unassigned_by_user_id = auth.uid(), reason = coalesce(p_reason, reason)
  where service_request_id = p_request_id and unassigned_at is null;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Request % has no current assignment', p_request_id using errcode = '22023';
  end if;

  update public.service_requests set assigned_staff_id = null
  where service_request_id = p_request_id;
end;
$function$;

-- change_request_status
CREATE OR REPLACE FUNCTION public.change_request_status(p_request_id uuid, p_new_status request_status, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role   public.staff_role := public.current_staff_role();
  v_old    public.request_status;
begin
  if v_role is null then
    raise exception 'Only active staff can change a request status' using errcode = '42501';
  end if;

  select status into v_old
  from public.service_requests
  where service_request_id = p_request_id
  for update;                                   -- lock the row for this transaction
  if not found then
    raise exception 'Request % not found', p_request_id using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.status_transitions
    where from_status = v_old and to_status = p_new_status and v_role = any (allowed_roles)
  ) then
    raise exception 'Status change from "%" to "%" is not allowed for role %', v_old, p_new_status, v_role
      using errcode = '22023';
  end if;

  update public.service_requests
  set status      = p_new_status,
      resolved_at = case when p_new_status = 'Resolved' then now() else resolved_at end,
      closed_at   = case when p_new_status = 'Closed'   then now() else closed_at end
  where service_request_id = p_request_id;

  insert into public.request_status_history
    (service_request_id, from_status, to_status, changed_by_user_id, note)
  values (p_request_id, v_old, p_new_status, auth.uid(), p_note);
end;
$function$;

-- Restrict RPC execution to authenticated sessions.
REVOKE ALL ON FUNCTION public.assign_request(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unassign_request(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.change_request_status(uuid, public.request_status, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.assign_request(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unassign_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_request_status(uuid, public.request_status, text) TO authenticated;
