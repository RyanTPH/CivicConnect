-- CivicConnect: allow administrator status overrides.
-- Admins follow valid workflow transitions but do not
-- need to be assigned to the request.
-- All successful changes remain recorded in history.

BEGIN;

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
    -- Only active staff, managers and admins may process statuses.
    IF v_role IS NULL
       OR v_role NOT IN ('staff', 'manager', 'admin')
       OR v_self IS NULL THEN
        RAISE EXCEPTION 'Role cannot change request statuses'
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

    -- Staff and managers must own the current assignment.
    -- Administrators may override without being assigned.
    IF v_role <> 'admin'
       AND v_assigned_staff_id IS DISTINCT FROM v_self THEN
        RAISE EXCEPTION 'You are not assigned to this request'
            USING ERRCODE = '42501';
    END IF;

    -- An administrator can perform an existing staff/manager
    -- transition, but cannot invent a new transition.
    IF NOT EXISTS (
        SELECT 1
        FROM public.status_transitions AS st
        WHERE st.from_status = v_old
          AND st.to_status = p_new_status
          AND (
              v_role = ANY(st.allowed_roles)
              OR (
                  v_role = 'admin'
                  AND st.allowed_roles && ARRAY[
                      'staff'::public.staff_role,
                      'manager'::public.staff_role
                  ]
              )
          )
    ) THEN
        RAISE EXCEPTION
            'Status change from "%" to "%" is not permitted',
            v_old, p_new_status
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

    -- Preserve the audit trail of the administrator's action.
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

COMMIT;