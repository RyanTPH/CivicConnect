-- M3: In-app notifications for service request status changes.
-- Database trigger handles persistence; JavaScript Observer Pattern handles UI updates.

-- Remove the older, faulty history notification trigger if it exists.
DROP TRIGGER IF EXISTS trg_status_history_notify
ON public.request_status_history;

-- Create a notification after a successful status change.
CREATE OR REPLACE FUNCTION public.notify_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_recipient_user_id uuid;
    v_event_type public.notification_event;
BEGIN
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    SELECT r.user_id
    INTO v_recipient_user_id
    FROM public.requesters r
    WHERE r.requester_id = NEW.requester_id;

    IF v_recipient_user_id IS NULL THEN
        RAISE EXCEPTION 'Requester user not found for notification';
    END IF;

    v_event_type := CASE NEW.status::text
        WHEN 'Accepted' THEN 'accepted'::public.notification_event
        WHEN 'Rejected' THEN 'rejected'::public.notification_event
        WHEN 'Resolved' THEN 'resolved'::public.notification_event
        WHEN 'Closed' THEN 'closed'::public.notification_event
        ELSE 'updated'::public.notification_event
    END;

    INSERT INTO public.notifications (
        recipient_user_id,
        service_request_id,
        event_type,
        status_snapshot,
        channel,
        delivery_status
    )
    VALUES (
        v_recipient_user_id,
        NEW.service_request_id,
        v_event_type,
        NEW.status::text,
        'in_app',
        'pending'
    );

    RETURN NEW;
END;
$$;

-- Ensure only one notification trigger is attached.
DROP TRIGGER IF EXISTS trg_notify_request_status_change
ON public.service_requests;

CREATE TRIGGER trg_notify_request_status_change
AFTER UPDATE OF status
ON public.service_requests
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.notify_request_status_change();

-- Allow authenticated users to retrieve only their own notifications.
CREATE OR REPLACE FUNCTION public.get_my_notifications()
RETURNS SETOF public.notifications
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT n.*
    FROM public.notifications n
    WHERE n.recipient_user_id = (SELECT auth.uid())
    ORDER BY n.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_notifications()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_my_notifications()
TO authenticated;
