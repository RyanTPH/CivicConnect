-- CivicConnect: prerequisite management helpers exported from the live database.
-- Place before 20261016090506_management_reports.sql.
-- IMPORTANT: require_staff_role() depends on public.current_staff_role().
-- Confirm that current_staff_role() is defined by an earlier migration.
-- Run with the same privileged database role used for other migrations.

-- is_open_request (identity args: p_status request_status)
CREATE OR REPLACE FUNCTION public.is_open_request(p_status public.request_status)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select p_status not in ('Resolved', 'Closed', 'Rejected')
$function$;

-- require_staff_role (identity args: p_roles staff_role[])
CREATE OR REPLACE FUNCTION public.require_staff_role(p_roles public.staff_role[])
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_role public.staff_role := public.current_staff_role();
begin
  if v_role is null or not (v_role = any (p_roles)) then
    raise exception 'You are not authorised to do this' using errcode = '42501';
  end if;
end;
$function$;

-- Avoid PostgreSQL's default PUBLIC execute grant on new functions.
-- is_open_request() is a pure status predicate and safe for authenticated use.
REVOKE ALL ON FUNCTION public.is_open_request(public.request_status)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_open_request(public.request_status)
  TO authenticated, service_role;

-- Role guard is used internally by privileged management functions.
-- Direct client execution is unnecessary.
REVOKE ALL ON FUNCTION public.require_staff_role(public.staff_role[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.require_staff_role(public.staff_role[])
  TO service_role;
