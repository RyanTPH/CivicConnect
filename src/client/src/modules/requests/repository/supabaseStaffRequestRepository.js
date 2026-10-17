import { supabase } from "../../../shared/lib/supabaseClient";
import { validateStaffRequestFilters } from "../service/staffRequestService";

export async function getStaffRequests(filters = {}) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const validatedFilters = validateStaffRequestFilters(filters);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("A signed-in staff member is required.");
  }

  let query = supabase
    .from("service_requests")
    .select("*")
    .order("created_at", { ascending: false });

  for (const [column, value] of Object.entries(validatedFilters)) {
    query = query.eq(column, value);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to retrieve staff requests: ${error.message}`);
  }

  return data ?? [];
}


export async function assignStaffRequest(requestId, staffId, reason) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  if (!requestId || !staffId || !reason?.trim()) {
    throw new Error("Request ID, staff ID and reason are required.");
  }

  const { error } = await supabase.rpc("assign_request", {
    p_request_id: requestId,
    p_staff_id: staffId,
    p_reason: reason.trim(),
  });

  if (error) {
    throw new Error(`Unable to assign request: ${error.message}`);
  }
}

export async function unassignStaffRequest(requestId, reason) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  if (!requestId || !reason?.trim()) {
    throw new Error("Request ID and reason are required.");
  }

  const { error } = await supabase.rpc("unassign_request", {
    p_request_id: requestId,
    p_reason: reason.trim(),
  });

  if (error) {
    throw new Error(`Unable to unassign request: ${error.message}`);
  }
}


// Read an authorised request and its related history for staff.
export async function getStaffRequestDetails(requestId) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(requestId ?? "")) {
    throw new Error("Invalid request identifier.");
  }

  // Validate the current authentication session.
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData?.user) {
    throw new Error("A signed-in staff member is required.");
  }

  // Verify that the authenticated account has an active staff record.
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("staff_id")
    .eq("user_id", authData.user.id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (staffError) {
    throw new Error("Unable to verify staff access.");
  }

  if (!staff) {
    throw new Error("An active staff profile is required.");
  }

  // RLS determines whether this staff member may read the request.
  const { data: request, error: requestError } = await supabase
    .from("service_requests")
    .select(
      [
        "service_request_id",
        "reference_number",
        "requester_id",
        "assigned_staff_id",
        "title",
        "description",
        "category",
        "status",
        "priority",
        "created_at",
        "received_at",
        "updated_at",
        "due_at",
        "resolved_at",
        "closed_at",
        "resolution_summary",
      ].join(",")
    )
    .eq("service_request_id", requestId)
    .maybeSingle();

  if (requestError) {
    throw new Error("Unable to retrieve request details.");
  }

  if (!request) {
    throw new Error(
      "The request was not found or is not accessible."
    );
  }

  // Related records use their own RLS policies.
  const [historyResult, commentsResult] = await Promise.all([
    supabase
      .from("request_status_history")
      .select(
        "request_status_history_id, from_status, to_status, note, changed_at"
      )
      .eq("service_request_id", requestId)
      .order("changed_at", { ascending: true }),

    supabase
      .from("comments")
      .select(
        "comment_id, comment_text, author_user_id, is_internal, date_created"
      )
      .eq("service_request_id", requestId)
      .order("date_created", { ascending: true }),
  ]);

  return {
    request,
    history: historyResult.error
      ? []
      : (historyResult.data ?? []),
    comments: commentsResult.error
      ? []
      : (commentsResult.data ?? []),
    historyUnavailable: Boolean(historyResult.error),
    commentsUnavailable: Boolean(commentsResult.error),
  };
}

