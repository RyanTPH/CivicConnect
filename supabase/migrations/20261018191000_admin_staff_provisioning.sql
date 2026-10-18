-- CivicConnect: preserve verified administrator staff-provisioning functions.
-- Exported from the working Supabase database on 2026-10-18.
-- SECURITY: never expose auth.users lookup to anon/authenticated.
-- This migration should run as the privileged Supabase migration owner.

-- is_current_admin
CREATE OR REPLACE FUNCTION public.is_current_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.staff AS s
        WHERE s.user_id = (SELECT auth.uid())
          AND s.role = 'admin'::public.staff_role
          AND s.is_active = true
          AND s.deleted_at IS NULL
    );
$function$;

-- find_auth_user_by_email
CREATE OR REPLACE FUNCTION public.find_auth_user_by_email(p_email text)
 RETURNS TABLE(id uuid, email_confirmed_at timestamp with time zone, banned_until timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    SELECT
        u.id,
        u.email_confirmed_at,
        u.banned_until
    FROM auth.users AS u
    WHERE LOWER(u.email) = LOWER(BTRIM(p_email))
    LIMIT 1;
$function$;

-- add_staff_member
CREATE OR REPLACE FUNCTION public.add_staff_member(p_user_id uuid, p_first_name text, p_last_name text, p_role text, p_department text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_staff_id uuid;
    v_deleted_at timestamptz;
BEGIN
    -- Only an active, non-deleted administrator may add staff.
    IF NOT public.is_current_admin() THEN
        RAISE EXCEPTION 'Only admins can add staff'
            USING ERRCODE = '42501';
    END IF;

    -- Validate the supplied identity and names.
    IF p_user_id IS NULL
       OR NULLIF(BTRIM(p_first_name), '') IS NULL
       OR NULLIF(BTRIM(p_last_name), '') IS NULL THEN
        RAISE EXCEPTION 'Missing required staff information'
            USING ERRCODE = '22023';
    END IF;

    IF CHAR_LENGTH(p_first_name) > 100
       OR CHAR_LENGTH(p_last_name) > 100
       OR CHAR_LENGTH(COALESCE(p_department, '')) > 100 THEN
        RAISE EXCEPTION 'Staff information exceeds allowed length'
            USING ERRCODE = '22023';
    END IF;

    -- Retired supervisor role is deliberately excluded.
    IF p_role IS NULL
       OR p_role NOT IN ('staff', 'manager', 'admin') THEN
        RAISE EXCEPTION 'Invalid staff role'
            USING ERRCODE = '22023';
    END IF;

    -- Lock any existing staff record to avoid conflicting updates.
    SELECT
        s.staff_id,
        s.deleted_at
    INTO
        v_staff_id,
        v_deleted_at
    FROM public.staff AS s
    WHERE s.user_id = p_user_id
    FOR UPDATE;

    IF FOUND THEN
        -- An existing active/non-deleted staff account
        -- must not be silently overwritten.
        IF v_deleted_at IS NULL THEN
            RAISE EXCEPTION 'This person is already a staff member'
                USING ERRCODE = '23505';
        END IF;

        -- Restore the existing staff identity and history.
        UPDATE public.staff
        SET
            first_name = BTRIM(p_first_name),
            last_name = BTRIM(p_last_name),
            role = p_role::public.staff_role,
            department = NULLIF(BTRIM(p_department), ''),
            is_active = true,
            deleted_at = NULL,
            deleted_by = NULL
        WHERE staff_id = v_staff_id;

        RETURN jsonb_build_object(
            'staff_id', v_staff_id,
            'rehired', true
        );
    END IF;

    -- First-time staff member: reuse the Auth account
    -- created or identified by the Edge Function.
    INSERT INTO public.staff (
        user_id,
        first_name,
        last_name,
        role,
        department,
        is_active
    )
    VALUES (
        p_user_id,
        BTRIM(p_first_name),
        BTRIM(p_last_name),
        p_role::public.staff_role,
        NULLIF(BTRIM(p_department), ''),
        true
    )
    RETURNING staff_id INTO v_staff_id;

    RETURN jsonb_build_object(
        'staff_id', v_staff_id,
        'rehired', false
    );
END;
$function$;

-- Explicit API execution permissions for SECURITY DEFINER functions.
-- PostgreSQL grants EXECUTE to PUBLIC on new functions by default.
REVOKE ALL ON FUNCTION public.is_current_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.find_auth_user_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_staff_member(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_current_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_auth_user_by_email(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_staff_member(uuid, text, text, text, text) TO authenticated, service_role;
