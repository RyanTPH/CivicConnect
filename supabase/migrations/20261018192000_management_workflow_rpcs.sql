-- CivicConnect: preserve verified management dashboard/assignment RPCs.
-- Exported from the working Supabase database on 2026-10-18.
-- Dependencies from earlier migrations: public.require_staff_role(),
-- public.is_open_request(), public.staff_current, and workflow tables.
-- Each SECURITY DEFINER RPC guards access via require_staff_role().

-- The exported team_overview function uses an unqualified staff_role
-- type in its signature; make resolution deterministic while creating it.
SET search_path = public, pg_catalog;

-- assignable_staff
CREATE OR REPLACE FUNCTION public.assignable_staff()
 RETURNS TABLE(staff_id uuid, first_name text, last_name text, role staff_role, department text, open_tasks integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
begin
  perform public.require_staff_role('{manager,admin}');
  return query
  select s.staff_id, s.first_name, s.last_name, s.role, s.department,
         (select count(*) from service_requests r
          where r.assigned_staff_id = s.staff_id and is_open_request(r.status))::int
  from staff_current s
  where s.is_active and s.role <> 'admin'     -- platform admins are not assignable by default
  order by 6, s.last_name;
end;
$function$;

-- manager_summary
CREATE OR REPLACE FUNCTION public.manager_summary()
 RETURNS TABLE(unassigned_requests integer, active_staff integer, inactive_staff integer, open_tasks integer, overdue_tasks integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
begin
  perform public.require_staff_role('{manager,admin}');
  return query
  select
    (select count(*) from service_requests r where is_open_request(r.status) and r.assigned_staff_id is null)::int,
    (select count(*) from staff_current s where s.is_active)::int,
    (select count(*) from staff_current s where not s.is_active)::int,
    (select count(*) from service_requests r where is_open_request(r.status))::int,
    (select count(*) from service_requests r where is_open_request(r.status) and r.due_at < now())::int;
end;
$function$;

-- request_assignment_history
CREATE OR REPLACE FUNCTION public.request_assignment_history(p_request_id uuid)
 RETURNS TABLE(assignment_id uuid, service_request_id uuid, reference_number text, assigned_to_staff_id uuid, assigned_to_name text, assigned_at timestamp with time zone, assigned_by_name text, unassigned_at timestamp with time zone, unassigned_by_name text, reason text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
begin
  perform public.require_staff_role('{manager,admin}');
  return query
  select a.assignment_id, a.service_request_id, r.reference_number, a.assigned_to_staff_id,
         btrim(t.first_name || ' ' || t.last_name), a.assigned_at,
         btrim(ab.first_name || ' ' || ab.last_name), a.unassigned_at,
         btrim(ub.first_name || ' ' || ub.last_name), a.reason
  from request_assignments a
  join service_requests r on r.service_request_id = a.service_request_id
  join staff t on t.staff_id = a.assigned_to_staff_id
  left join staff ab on ab.user_id = a.assigned_by_user_id
  left join staff ub on ub.user_id = a.unassigned_by_user_id
  where a.service_request_id = p_request_id
  order by a.assigned_at desc;
end;
$function$;

-- requests_for_assignment
CREATE OR REPLACE FUNCTION public.requests_for_assignment(p_assignment text DEFAULT 'all'::text, p_category text DEFAULT NULL::text, p_priority text DEFAULT NULL::text, p_staff_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(service_request_id uuid, reference_number text, title text, category text, priority text, status text, due_at timestamp with time zone, is_overdue boolean, assigned_staff_id uuid, assigned_to_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$#variable_conflict use_column
begin
  perform public.require_staff_role('{manager,admin}');
  if p_assignment not in ('all', 'unassigned', 'assigned') then
    raise exception 'Unknown assignment filter: %', p_assignment using errcode = '22023';
  end if;
  return query
  select r.service_request_id, r.reference_number, r.title, r.category::text, r.priority::text,
         r.status::text, r.due_at, (r.due_at is not null 
         and r.due_at < now()
         and public.is_open_request(r.status)
       )  AS is_overdue,
         r.assigned_staff_id, nullif(btrim(s.first_name || ' ' || s.last_name), ''), r.created_at
  from service_requests r
  left join staff s on s.staff_id = r.assigned_staff_id
  where r.status not in ('Closed', 'Rejected')
    and (p_assignment = 'all'
         or (p_assignment = 'unassigned' and r.assigned_staff_id is null)
         or (p_assignment = 'assigned'   and r.assigned_staff_id is not null))
    and (p_category is null or r.category = p_category)
    and (p_priority is null or r.priority = p_priority)
    and (p_staff_id is null or r.assigned_staff_id = p_staff_id)
  order by (r.assigned_staff_id is not null), r.due_at nulls last, r.created_at
  limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0);
end;$function$;

-- staff_assignment_history
CREATE OR REPLACE FUNCTION public.staff_assignment_history(p_staff_id uuid, p_limit integer DEFAULT 50)
 RETURNS TABLE(assignment_id uuid, service_request_id uuid, reference_number text, assigned_to_staff_id uuid, assigned_to_name text, assigned_at timestamp with time zone, assigned_by_name text, unassigned_at timestamp with time zone, unassigned_by_name text, reason text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
begin
  perform public.require_staff_role('{manager,admin}');
  return query
  select a.assignment_id, a.service_request_id, r.reference_number, a.assigned_to_staff_id,
         btrim(t.first_name || ' ' || t.last_name), a.assigned_at,
         btrim(ab.first_name || ' ' || ab.last_name), a.unassigned_at,
         btrim(ub.first_name || ' ' || ub.last_name), a.reason
  from request_assignments a
  join service_requests r on r.service_request_id = a.service_request_id
  join staff t on t.staff_id = a.assigned_to_staff_id
  left join staff ab on ab.user_id = a.assigned_by_user_id
  left join staff ub on ub.user_id = a.unassigned_by_user_id
  where a.assigned_to_staff_id = p_staff_id
  order by a.assigned_at desc
  limit least(greatest(p_limit, 1), 200);
end;
$function$;

-- staff_task_summary
CREATE OR REPLACE FUNCTION public.staff_task_summary(p_staff_id uuid)
 RETURNS TABLE(staff_id uuid, first_name text, last_name text, role staff_role, department text, is_active boolean, deleted_at timestamp with time zone, assigned_open integer, in_progress integer, overdue integer, resolved integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
begin
  perform public.require_staff_role('{manager,admin}');
  return query
  select s.staff_id, s.first_name, s.last_name, s.role, s.department, s.is_active, s.deleted_at,
    (select count(*) from service_requests r where r.assigned_staff_id = s.staff_id and is_open_request(r.status))::int,
    (select count(*) from service_requests r where r.assigned_staff_id = s.staff_id and r.status = 'In Progress')::int,
    (select count(*) from service_requests r where r.assigned_staff_id = s.staff_id and is_open_request(r.status) and r.due_at < now())::int,
    (select count(*) from service_requests r where r.assigned_staff_id = s.staff_id and r.status in ('Resolved', 'Closed'))::int
  from staff s where s.staff_id = p_staff_id;
  if not found then
    raise exception 'Staff member % not found', p_staff_id using errcode = 'P0002';
  end if;
end;
$function$;

-- staff_tasks
CREATE OR REPLACE FUNCTION public.staff_tasks(p_staff_id uuid)
 RETURNS TABLE(service_request_id uuid, reference_number text, title text, category text, priority text, status text, due_at timestamp with time zone, is_overdue boolean, assigned_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
begin
  perform public.require_staff_role('{manager,admin}');
  return query
  select r.service_request_id, r.reference_number, r.title, r.category::text, r.priority::text,
         r.status::text, r.due_at, (r.due_at is not null and r.due_at < now() and is_open_request(r.status)),
         a.assigned_at
  from service_requests r
  left join request_assignments a on a.service_request_id = r.service_request_id and a.unassigned_at is null
  where r.assigned_staff_id = p_staff_id and r.status not in ('Closed', 'Rejected')
  order by r.due_at nulls last, r.created_at;
end;
$function$;

-- team_overview
CREATE OR REPLACE FUNCTION public.team_overview(p_role staff_role DEFAULT NULL::staff_role, p_department text DEFAULT NULL::text, p_active boolean DEFAULT NULL::boolean)
 RETURNS TABLE(staff_id uuid, first_name text, last_name text, role staff_role, department text, is_active boolean, open_tasks integer, overdue_tasks integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
begin
  perform public.require_staff_role('{manager,admin}');
  return query
  select s.staff_id, s.first_name, s.last_name, s.role, s.department, s.is_active,
         coalesce(c.open_tasks, 0)::int, coalesce(c.overdue_tasks, 0)::int
  from staff_current s
  left join (
    select r.assigned_staff_id,
           count(*) as open_tasks,
           count(*) filter (where r.due_at < now()) as overdue_tasks
    from service_requests r
    where is_open_request(r.status) and r.assigned_staff_id is not null
    group by r.assigned_staff_id
  ) c on c.assigned_staff_id = s.staff_id
  where (p_role is null or s.role = p_role)
    and (p_department is null or s.department = p_department)
    and (p_active is null or s.is_active = p_active)
  order by s.last_name, s.first_name;
end;
$function$;

-- Allow logged-in users to call the RPCs; the RPC body restricts
-- actual access to manager/admin roles. Do not expose to anon.
REVOKE ALL ON FUNCTION public.assignable_staff() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.manager_summary() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_assignment_history(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.requests_for_assignment(text, text, text, uuid, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.staff_assignment_history(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.staff_task_summary(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.staff_tasks(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.team_overview(public.staff_role, text, boolean) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.assignable_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_assignment_history(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.requests_for_assignment(text, text, text, uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_assignment_history(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_task_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_tasks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_overview(public.staff_role, text, boolean) TO authenticated;

RESET search_path;
