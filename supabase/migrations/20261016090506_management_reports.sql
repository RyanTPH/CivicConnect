-- CivicConnect management reporting (FR-015).
--
-- Reports use a cohort of requests CREATED in the selected
-- inclusive date range, interpreted in South African time.
--
-- Completed = current status Resolved or Closed.
-- Eligible = all requests except Rejected.
-- Resolution rate = completed / eligible * 100.
--
-- Only manager and admin accounts may execute successfully.

CREATE OR REPLACE FUNCTION public.management_report(
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL,
    p_category text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_start date;
    v_end date;
    v_report jsonb;
BEGIN
    -- Enforce management permission inside PostgreSQL.
   PERFORM public.require_staff_role('{manager,admin}');

    -- Default to the last 30 calendar days.
    v_end := COALESCE(
        p_end_date,
        (now() AT TIME ZONE 'Africa/Johannesburg')::date
    );

    v_start := COALESCE(p_start_date, v_end - 29);

    IF v_start > v_end THEN
        RAISE EXCEPTION 'Start date must be before end date'
            USING ERRCODE = '22023';
    END IF;

    IF p_category IS NOT NULL
       AND p_category NOT IN (
           'Water and Sanitation',
           'Roads and Transport',
           'Electricity',
           'Waste Management',
           'Public Safety',
           'Other'
       ) THEN
        RAISE EXCEPTION 'Invalid request category'
            USING ERRCODE = '22023';
    END IF;

    WITH
    -- One filtered data set shared by every report section.
    cohort AS MATERIALIZED (
        SELECT
            sr.service_request_id,
            sr.category::text AS category,
            sr.status::text AS status,
            sr.assigned_staff_id,
            sr.due_at
        FROM public.service_requests sr
        WHERE sr.created_at >= (
            v_start::timestamp AT TIME ZONE 'Africa/Johannesburg'
        )
          AND sr.created_at < (
            (v_end + 1)::timestamp
            AT TIME ZONE 'Africa/Johannesburg'
        )
          AND (
              p_category IS NULL
              OR sr.category::text = p_category
          )
    ),

    totals AS (
        SELECT
            COUNT(*)::integer AS total_requests,

            COUNT(*) FILTER (
                WHERE status <> 'Rejected'
            )::integer AS eligible_requests,

            COUNT(*) FILTER (
                WHERE status IN ('Resolved', 'Closed')
            )::integer AS completed_requests,

            COUNT(*) FILTER (
                WHERE status = 'Rejected'
            )::integer AS rejected_requests,

            COUNT(*) FILTER (
                WHERE status IN (
                    'Submitted', 'Accepted', 'In Progress'
                )
            )::integer AS open_requests,

            COUNT(*) FILTER (
                WHERE status IN (
                    'Submitted', 'Accepted', 'In Progress'
                )
                AND due_at < now()
            )::integer AS overdue_requests
        FROM cohort
    ),

    -- Include every valid status, even when its count is zero.
    status_counts AS (
        SELECT
            values_list.status,
            values_list.ord,
            COUNT(c.service_request_id)::integer AS request_count
        FROM unnest(ARRAY[
            'Submitted',
            'Accepted',
            'In Progress',
            'Resolved',
            'Closed',
            'Rejected'
        ]::text[]) WITH ORDINALITY
            AS values_list(status, ord)
        LEFT JOIN cohort c ON c.status = values_list.status
        GROUP BY values_list.status, values_list.ord
    ),

    -- Include every valid category, even when empty.
    category_counts AS (
        SELECT
            values_list.category,
            values_list.ord,
            COUNT(c.service_request_id)::integer AS request_count
        FROM unnest(ARRAY[
            'Water and Sanitation',
            'Roads and Transport',
            'Electricity',
            'Waste Management',
            'Public Safety',
            'Other'
        ]::text[]) WITH ORDINALITY
            AS values_list(category, ord)
        LEFT JOIN cohort c ON c.category = values_list.category
        GROUP BY values_list.category, values_list.ord
    ),

    -- Current assigned workload for requests in the cohort.
    staff_workload AS (
        SELECT
            s.staff_id,
            concat_ws(
                ' ',
                s.first_name,
                s.last_name
            ) AS staff_name,
            s.department,

            COUNT(c.service_request_id) FILTER (
                WHERE c.status IN (
                    'Submitted', 'Accepted', 'In Progress'
                )
            )::integer AS open_requests,

            COUNT(c.service_request_id) FILTER (
                WHERE c.status IN (
                    'Submitted', 'Accepted', 'In Progress'
                )
                AND c.due_at < now()
            )::integer AS overdue_requests

        FROM public.staff s
        LEFT JOIN cohort c
            ON c.assigned_staff_id = s.staff_id
        WHERE s.deleted_at IS NULL
          AND s.role IN ('staff', 'manager')
        GROUP BY
            s.staff_id,
            s.first_name,
            s.last_name,
            s.department
    )

    SELECT jsonb_build_object(
        'start_date', v_start,
        'end_date', v_end,
        'category', p_category,

        'summary', jsonb_build_object(
            'total_requests', t.total_requests,
            'eligible_requests', t.eligible_requests,
            'completed_requests', t.completed_requests,
            'rejected_requests', t.rejected_requests,
            'open_requests', t.open_requests,
            'overdue_requests', t.overdue_requests,

            'resolution_rate',
            COALESCE(
                ROUND(
                    100.0 * t.completed_requests
                    / NULLIF(t.eligible_requests, 0),
                    1
                ),
                0
            )
        ),

        'by_status', (
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'status', sc.status,
                        'count', sc.request_count
                    )
                    ORDER BY sc.ord
                ),
                '[]'::jsonb
            )
            FROM status_counts sc
        ),

        'by_category', (
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'category', cc.category,
                        'count', cc.request_count
                    )
                    ORDER BY cc.ord
                ),
                '[]'::jsonb
            )
            FROM category_counts cc
        ),

        'staff_workload', (
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'staff_id', sw.staff_id,
                        'staff_name', sw.staff_name,
                        'department', sw.department,
                        'open_requests', sw.open_requests,
                        'overdue_requests', sw.overdue_requests
                    )
                    ORDER BY sw.open_requests DESC, sw.staff_name
                ),
                '[]'::jsonb
            )
            FROM staff_workload sw
        )
    )
    INTO v_report
    FROM totals t;

    RETURN v_report;
END;
$$;

-- Only authenticated users may call this function.
-- Its internal role check further limits access to management.
REVOKE ALL ON FUNCTION
    public.management_report(date, date, text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
    public.management_report(date, date, text)
TO authenticated;