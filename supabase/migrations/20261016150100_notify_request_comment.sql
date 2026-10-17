-- ============================================================
-- CivicConnect: Notify Users When Comments Are Added
-- ============================================================
-- Requester public comment -> currently assigned staff member.
-- Assigned staff public comment -> requester.
-- Internal staff notes -> no requester notification.
--
-- Notifications are created only after a successful comment
-- INSERT and use the existing public.notifications table.
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_request_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_requester_user_id uuid;
    v_assigned_staff_user_id uuid;
    v_recipient_user_id uuid;
BEGIN
    -- Internal staff notes must not notify the requester.
    IF NEW.is_internal IS TRUE THEN
        RETURN NEW;
    END IF;

    -- Look up the requester's user ID and the currently
    -- assigned staff member's user ID.
    SELECT
        requester.user_id,
        assigned_staff.user_id
    INTO
        v_requester_user_id,
        v_assigned_staff_user_id
    FROM public.service_requests AS sr
    JOIN public.requesters AS requester
        ON requester.requester_id = sr.requester_id
    LEFT JOIN public.staff AS assigned_staff
        ON assigned_staff.staff_id = sr.assigned_staff_id
    WHERE sr.service_request_id = NEW.service_request_id;

    -- No matching request: do not generate a notification.
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- If the requester commented, notify assigned staff.
    IF NEW.author_user_id = v_requester_user_id THEN
        v_recipient_user_id := v_assigned_staff_user_id;

    -- If assigned staff commented, notify the requester.
    ELSIF NEW.author_user_id = v_assigned_staff_user_id THEN
        v_recipient_user_id := v_requester_user_id;

    -- Don't notify anyone for unrelated authors.
    ELSE
        RETURN NEW;
    END IF;

    -- No recipient, or the recipient is the author.
    IF v_recipient_user_id IS NULL
       OR v_recipient_user_id = NEW.author_user_id THEN
        RETURN NEW;
    END IF;

    -- Store the notification in the existing notification table.
    INSERT INTO public.notifications (
        notification_id,
        recipient_user_id,
        service_request_id,
        event_type,
        status_snapshot,
        channel,
        delivery_status,
        created_at
    )
    VALUES (
        gen_random_uuid(),
        v_recipient_user_id,
        NEW.service_request_id,
        'comment_added'::public.notification_event,
        NULL,
        'in_app'::public.notification_channel,
        'pending'::public.delivery_status,
        now()
    );

    RETURN NEW;
END;
$function$;

-- The trigger function is not intended to be called
-- directly through the public API.
REVOKE ALL ON FUNCTION public.notify_request_comment()
FROM PUBLIC, anon, authenticated;

-- Create the trigger only if it does not already exist.
-- This preserves the existing audit and comment-protection
-- triggers on public.comments.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_notify_request_comment'
          AND tgrelid = 'public.comments'::regclass
          AND NOT tgisinternal
    ) THEN

        CREATE TRIGGER trg_notify_request_comment
        AFTER INSERT ON public.comments
        FOR EACH ROW
        EXECUTE FUNCTION public.notify_request_comment();

    END IF;
END;
$$;