
-- CivicConnect Milestone 3
-- Harden staff assignment and request status authorisation.
-- General staff may only claim unassigned requests and
-- change the status of requests assigned to themselves.

-- 1. Secure request assignment
CREATE OR REPLACE FUNCTION public.assign_request(
    p_request_id uuid,
    p_staff_id uuid,
    p_reason text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_role public.staff_role := public.current_staff_role();
    v_self uuid := public.current_staff_id();
    v_status public.request_status;
    v_assigned_staff_id uuid;
BEGIN
    IF v_role IS NULL THEN
        RAISE EXCEPTION 'Only active staff can assign requests'
            USING ERRCODE = '42501';
    END IF;

    IF v_role = 'staff'
       AND p_staff_id IS DISTINCT FROM v_self THEN
        RAISE EXCEPTION 'General staff can only assign themselves'
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.staff
        WHERE staff_id = p_staff_id
          AND is_active
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'The selected staff member is not active'
            USING ERRCODE = '22023';
    END IF;

    SELECT status, assigned_staff_id
    INTO v_status, v_assigned_staff_id
    FROM public.service_requests
    WHERE service_request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request % not found', p_request_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_status IN ('Closed', 'Rejected') THEN
        RAISE EXCEPTION 'A % request cannot be assigned', v_status
            USING ERRCODE = '22023';
    END IF;

    -- General staff cannot take requests already assigned.
    IF v_role = 'staff'
       AND v_assigned_staff_id IS NOT NULL THEN
        RAISE EXCEPTION 'General staff can only claim unassigned requests'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.request_assignments
    SET unassigned_at = now(),
        unassigned_by_user_id = auth.uid()
    WHERE service_request_id = p_request_id
      AND unassigned_at IS NULL;

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

    UPDATE public.service_requests
    SET assigned_staff_id = p_staff_id
    WHERE service_request_id = p_request_id;
END;
$function$;


-- 2. Secure request status changes
CREATE OR REPLACE FUNCTION public.change_request_status(
    p_request_id uuid,
    p_new_status public.request_status,
    p_note text DEFAULT NULL::text
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
    IF v_role IS NULL THEN
        RAISE EXCEPTION 'Only active staff can change a request status'
            USING ERRCODE = '42501';
    END IF;

    SELECT status, assigned_staff_id
    INTO v_old, v_assigned_staff_id
    FROM public.service_requests
    WHERE service_request_id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request % not found', p_request_id
            USING ERRCODE = 'P0002';
    END IF;

    -- General staff may only update their own assignments.
    IF v_role = 'staff'
       AND v_assigned_staff_id IS DISTINCT FROM v_self THEN
        RAISE EXCEPTION 'You are not assigned to this request'
            USING ERRCODE = '42501';
    END IF;

    -- Preserve existing role-based transition restrictions.
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


-- 3. Restrict RPC execution to authenticated users
REVOKE ALL ON FUNCTION public.assign_request(uuid, uuid, text)
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.change_request_status(
    uuid, public.request_status, text
)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.assign_request(uuid, uuid, text)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.change_request_status(
    uuid, public.request_status, text
)
TO authenticated;
