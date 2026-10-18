-- CivicConnect: enforce assignment ownership and role permissions.
-- Migration section 1: assign_request()

CREATE OR REPLACE FUNCTION public.assign_request(
    p_request_id uuid,
    p_staff_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_role public.staff_role := public.current_staff_role();
    v_self uuid := public.current_staff_id();
    v_target_role public.staff_role;
    v_current_role public.staff_role;
    v_status public.request_status;
    v_assigned_staff_id uuid;
BEGIN
    -- Only current operational staff and management may assign.
    IF v_role IS NULL
       OR v_role NOT IN ('staff', 'manager', 'admin')
       OR v_self IS NULL THEN
        RAISE EXCEPTION 'Not authorised to assign requests'
            USING ERRCODE = '42501';
    END IF;

    -- Confirm the proposed assignee is active and authorised.
    SELECT s.role
    INTO v_target_role
    FROM public.staff AS s
    WHERE s.staff_id = p_staff_id
      AND s.is_active = true
      AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Selected staff member is not active'
            USING ERRCODE = '22023';
    END IF;

    -- Admins and retired supervisors cannot receive requests.
    IF v_target_role NOT IN ('staff', 'manager') THEN
        RAISE EXCEPTION 'This role cannot receive assignments'
            USING ERRCODE = '42501';
    END IF;

    -- General staff can claim requests only for themselves.
    IF v_role = 'staff'
       AND p_staff_id IS DISTINCT FROM v_self THEN
        RAISE EXCEPTION 'Staff may only assign themselves'
            USING ERRCODE = '42501';
    END IF;

    -- Managers may assign staff or themselves,
    -- but not another manager.
    IF v_role = 'manager'
       AND v_target_role = 'manager'
       AND p_staff_id IS DISTINCT FROM v_self THEN
        RAISE EXCEPTION 'Managers cannot assign another manager'
            USING ERRCODE = '42501';
    END IF;

    -- Lock the request before inspecting or changing ownership.
    SELECT sr.status, sr.assigned_staff_id
    INTO v_status, v_assigned_staff_id
    FROM public.service_requests AS sr
    WHERE sr.service_request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status IN ('Closed', 'Rejected') THEN
        RAISE EXCEPTION 'Closed or rejected requests cannot be assigned'
            USING ERRCODE = '22023';
    END IF;

    -- General staff cannot take an existing assignment.
    IF v_role = 'staff'
       AND v_assigned_staff_id IS NOT NULL THEN
        RAISE EXCEPTION 'Staff can only claim unassigned requests'
            USING ERRCODE = '42501';
    END IF;

    -- Determine the role of the current assignee.
    SELECT s.role
    INTO v_current_role
    FROM public.staff AS s
    WHERE s.staff_id = v_assigned_staff_id;

    -- Managers must not take work from another manager.
    IF v_role = 'manager'
       AND v_current_role = 'manager'
       AND v_assigned_staff_id IS DISTINCT FROM v_self THEN
        RAISE EXCEPTION 'Cannot reassign another manager''s work'
            USING ERRCODE = '42501';
    END IF;

    -- Reassigning to the current owner does not create
    -- duplicate assignment-history records.
    IF v_assigned_staff_id = p_staff_id THEN
        RETURN;
    END IF;

    -- Close the previous assignment record, if one exists.
    UPDATE public.request_assignments
    SET unassigned_at = now(),
        unassigned_by_user_id = auth.uid()
    WHERE service_request_id = p_request_id
      AND unassigned_at IS NULL;

    -- Record the new assignment.
    INSERT INTO public.request_assignments (
        service_request_id,
        assigned_to_staff_id,
        assigned_by_user_id,
        reason
    )
    VALUES (
        p_request_id,
        p_staff_id,
        auth.uid(),
        p_reason
    );

    -- Update the request's current assignee.
    UPDATE public.service_requests
    SET assigned_staff_id = p_staff_id
    WHERE service_request_id = p_request_id;
END;
$function$;


-- Migration section 2: unassign_request()

CREATE OR REPLACE FUNCTION public.unassign_request(
    p_request_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_role public.staff_role := public.current_staff_role();
    v_self uuid := public.current_staff_id();
    v_assigned_staff_id uuid;
    v_assigned_role public.staff_role;
    v_rows integer;
BEGIN
    -- Only managers and admins may unassign requests.
    IF v_role IS NULL
       OR v_role NOT IN ('manager', 'admin')
       OR v_self IS NULL THEN
        RAISE EXCEPTION 'Not authorised to unassign requests'
            USING ERRCODE = '42501';
    END IF;

    SELECT sr.assigned_staff_id
    INTO v_assigned_staff_id
    FROM public.service_requests AS sr
    WHERE sr.service_request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF v_assigned_staff_id IS NULL THEN
        RAISE EXCEPTION 'Request has no current assignment'
            USING ERRCODE = '22023';
    END IF;

    SELECT s.role
    INTO v_assigned_role
    FROM public.staff AS s
    WHERE s.staff_id = v_assigned_staff_id;

    -- Managers cannot remove another manager's assignment.
    IF v_role = 'manager'
       AND v_assigned_role = 'manager'
       AND v_assigned_staff_id IS DISTINCT FROM v_self THEN
        RAISE EXCEPTION 'Cannot unassign another manager''s work'
            USING ERRCODE = '42501';
    END IF;

    -- Preserve the existing assignment history.
    UPDATE public.request_assignments
    SET unassigned_at = now(),
        unassigned_by_user_id = auth.uid(),
        reason = COALESCE(p_reason, reason)
    WHERE service_request_id = p_request_id
      AND unassigned_at IS NULL;

    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows = 0 THEN
        RAISE EXCEPTION 'No active assignment-history record exists'
            USING ERRCODE = '22023';
    END IF;

    UPDATE public.service_requests
    SET assigned_staff_id = NULL
    WHERE service_request_id = p_request_id;
END;
$function$;


-- Migration section 3: change_request_status()

CREATE OR REPLACE FUNCTION public.change_request_status(
    p_request_id uuid,
    p_new_status public.request_status,
    p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_role public.staff_role := public.current_staff_role();
    v_self uuid := public.current_staff_id();
    v_old public.request_status;
    v_assigned_staff_id uuid;
BEGIN
    -- Only general staff and managers process requests.
    -- Administrators remain oversight-only.
    IF v_role IS NULL
       OR v_role NOT IN ('staff', 'manager')
       OR v_self IS NULL THEN
        RAISE EXCEPTION 'Role cannot process service requests'
            USING ERRCODE = '42501';
    END IF;

    SELECT sr.status, sr.assigned_staff_id
    INTO v_old, v_assigned_staff_id
    FROM public.service_requests AS sr
    WHERE sr.service_request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found'
            USING ERRCODE = 'P0002';
    END IF;

    -- Both staff and managers must own the assignment.
    IF v_assigned_staff_id IS DISTINCT FROM v_self THEN
        RAISE EXCEPTION 'You are not assigned to this request'
            USING ERRCODE = '42501';
    END IF;

    -- Retain the existing transition rules.
    IF NOT EXISTS (
        SELECT 1
        FROM public.status_transitions
        WHERE from_status = v_old
          AND to_status = p_new_status
          AND v_role = ANY(allowed_roles)
    ) THEN
        RAISE EXCEPTION
            'Status change from "%" to "%" is not allowed for role %',
            v_old, p_new_status, v_role
            USING ERRCODE = '22023';
    END IF;

    -- Current status and history are updated together.
    UPDATE public.service_requests
    SET status = p_new_status,
        resolved_at = CASE
            WHEN p_new_status = 'Resolved'
            THEN now()
            ELSE resolved_at
        END,
        closed_at = CASE
            WHEN p_new_status = 'Closed'
            THEN now()
            ELSE closed_at
        END
    WHERE service_request_id = p_request_id;

    INSERT INTO public.request_status_history (
        service_request_id,
        from_status,
        to_status,
        changed_by_user_id,
        note
    )
    VALUES (
        p_request_id,
        v_old,
        p_new_status,
        auth.uid(),
        p_note
    );
END;
$function$;


-- Migration section 5: RPC execution grants.
-- Each function still performs its own role checks.

REVOKE ALL ON FUNCTION public.assign_request(
    uuid, uuid, text
) FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.unassign_request(
    uuid, text
) FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.change_request_status(
    uuid, public.request_status, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.assign_request(
    uuid, uuid, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.unassign_request(
    uuid, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.change_request_status(
    uuid, public.request_status, text
) TO authenticated;