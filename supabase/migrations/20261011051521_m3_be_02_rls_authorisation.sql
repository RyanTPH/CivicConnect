
-- Ticket #103: Initial RLS read permissions
-- Based on the pending CivicConnect 002 and 003 migrations.

-- 1. Enable RLS
ALTER TABLE public.requesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- 2. Restrict privileges for browser API roles
REVOKE ALL ON TABLE
  public.requesters,
  public.staff,
  public.service_requests
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
  public.requesters,
  public.staff,
  public.service_requests
TO authenticated;

-- 3. Requesters can read only their own active profile
CREATE POLICY "requesters_select_own"
ON public.requesters
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND deleted_at IS NULL
);

-- 4. Active staff can read their own staff profile
CREATE POLICY "staff_select_own"
ON public.staff
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND is_active = true
  AND deleted_at IS NULL
);

-- 5. Read only owned or currently assigned requests
CREATE POLICY "service_requests_select_authorised"
ON public.service_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.requesters r
    WHERE r.requester_id = service_requests.requester_id
      AND r.user_id = (SELECT auth.uid())
      AND r.deleted_at IS NULL
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.staff_id = service_requests.assigned_staff_id
      AND s.user_id = (SELECT auth.uid())
      AND s.is_active = true
      AND s.deleted_at IS NULL
  )
);
-- 6. Active administrators can read all service requests
CREATE POLICY "service_requests_select_admin"
ON public.service_requests
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.staff s
        WHERE s.user_id = (SELECT auth.uid())
          AND s.role = 'admin'::public.staff_role
          AND s.is_active = true
          AND s.deleted_at IS NULL
    )
);

-- 7. Only authenticated requesters can create service requests

-- Allow inserting only requester-controlled fields.
-- Status, priority and assignment use database defaults.
GRANT INSERT (
    requester_id,
    reference_number,
    title,
    description,
    category
)
ON public.service_requests
TO authenticated;

CREATE POLICY "service_requests_insert_requester"
ON public.service_requests
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.requesters r
        WHERE r.requester_id = service_requests.requester_id
          AND r.user_id = (SELECT auth.uid())
          AND r.deleted_at IS NULL
    )
    AND assigned_staff_id IS NULL
);

-- 8. Ordinary staff may update only requests assigned to them.
-- Column-level and workflow restrictions will be added separately.

CREATE POLICY "service_requests_update_assigned_staff"
ON public.service_requests
FOR UPDATE
TO authenticated

-- Check that the existing request is assigned to this staff member
USING (
    EXISTS (
        SELECT 1
        FROM public.staff s
        WHERE s.staff_id = service_requests.assigned_staff_id
          AND s.user_id = (SELECT auth.uid())
          AND s.role = 'staff'::public.staff_role
          AND s.is_active = true
          AND s.deleted_at IS NULL
    )
)

-- Check that the updated request remains assigned to this staff member
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.staff s
        WHERE s.staff_id = service_requests.assigned_staff_id
          AND s.user_id = (SELECT auth.uid())
          AND s.role = 'staff'::public.staff_role
          AND s.is_active = true
          AND s.deleted_at IS NULL
    )
);

-- 9. Active managers can read all service requests
CREATE POLICY "service_requests_select_manager"
ON public.service_requests
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.staff s
        WHERE s.user_id = (SELECT auth.uid())
          AND s.role = 'manager'::public.staff_role
          AND s.is_active = true
          AND s.deleted_at IS NULL
    )
);

-- 10. Enable RLS on sensitive workflow tables
ALTER TABLE public.request_assignments
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.request_status_history
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.status_transitions
ENABLE ROW LEVEL SECURITY;

-- 11. Deny direct browser access until explicit
-- authorised policies / workflow functions are defined
REVOKE ALL ON TABLE
    public.request_assignments,
    public.request_status_history,
    public.status_transitions
FROM PUBLIC, anon, authenticated;

-- 12. Read access to authorised request status history

GRANT SELECT ON TABLE
    public.request_status_history,
    public.request_assignments
TO authenticated;

-- Users may see history only for requests they can access.
CREATE POLICY "request_status_history_select_authorised"
ON public.request_status_history
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.service_requests sr
        WHERE sr.service_request_id =
              request_status_history.service_request_id
    )
);

-- Assignment history is for authorised internal users only.
CREATE POLICY "request_assignments_select_internal"
ON public.request_assignments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.staff s
        WHERE s.user_id = (SELECT auth.uid())
          AND s.is_active = true
          AND s.deleted_at IS NULL
    )
    AND EXISTS (
        SELECT 1
        FROM public.service_requests sr
        WHERE sr.service_request_id =
              request_assignments.service_request_id
    )
);

-- 13. Protect requester contact information

ALTER TABLE public.requester_contacts
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.requester_contacts
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.requester_contacts
TO authenticated;

CREATE POLICY "requester_contacts_select_own"
ON public.requester_contacts
FOR SELECT
TO authenticated
USING (
    deleted_at IS NULL
    AND EXISTS (
        SELECT 1
        FROM public.requesters r
        WHERE r.requester_id = requester_contacts.requester_id
          AND r.user_id = (SELECT auth.uid())
          AND r.deleted_at IS NULL
    )
);


-- 14. Protect request comments

ALTER TABLE public.comments
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.comments
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.comments
TO authenticated;

CREATE POLICY "comments_select_authorised"
ON public.comments
FOR SELECT
TO authenticated
USING (
    -- The user must be able to view the related request
    EXISTS (
        SELECT 1
        FROM public.service_requests sr
        WHERE sr.service_request_id =
              comments.service_request_id
    )
    AND (
        -- Ordinary comments are visible to authorised viewers
        is_internal = false

        OR

        -- Internal comments require an active staff profile
        EXISTS (
            SELECT 1
            FROM public.staff s
            WHERE s.user_id = (SELECT auth.uid())
              AND s.is_active = true
              AND s.deleted_at IS NULL
        )
    )
);

-- 15. Protect additional tables introduced by migrations 004-007
-- Direct application access is denied until explicit
-- role-specific access rules are implemented.

ALTER TABLE public.channel_messages
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.attachments
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_log
ENABLE ROW LEVEL SECURITY;

-- Remove unrestricted access for application roles
REVOKE ALL ON TABLE
    public.channel_messages,
    public.attachments,
    public.notifications,
    public.audit_log
FROM PUBLIC, anon, authenticated;