
-- CivicConnect Milestone 3
-- Allow authenticated users to mark their own notifications as read.

CREATE OR REPLACE FUNCTION public.mark_my_notification_read(
    p_notification_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.notifications
    SET read_at = NOW()
    WHERE notification_id = p_notification_id
      AND recipient_user_id = auth.uid()
      AND read_at IS NULL;

    -- No matching notification is left unchanged.
    -- This prevents users from modifying other users' notifications.
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_my_notification_read(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.mark_my_notification_read(uuid)
TO authenticated;
