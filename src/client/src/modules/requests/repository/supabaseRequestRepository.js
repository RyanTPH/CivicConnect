
import { supabase } from "../../../shared/lib/supabaseClient";

// Create errors that the frontend can identify.
function requestError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export async function saveServiceRequest(request) {
  // 1. Check Supabase configuration.
  if (!supabase) {
    throw requestError(
      "CONFIGURATION_ERROR",
      "Supabase is not configured."
    );
  }

  // 2. Validate required request information.
  const requiredFields = [
    "referenceNumber",
    "category",
    "title",
    "description",
  ];

  if (
    !request ||
    requiredFields.some(
      (field) =>
        typeof request[field] !== "string" ||
        !request[field].trim()
    )
  ) {
    throw requestError(
      "VALIDATION_ERROR",
      "Please complete all required fields."
    );
  }

  // 3. Get the currently authenticated user.
  const { data: authData, error: userError } =
    await supabase.auth.getUser();

  const user = authData?.user;

  if (userError || !user) {
    throw requestError(
      "AUTH_REQUIRED",
      "A signed-in requester is required to submit a request."
    );
  }

  // 4. Find the requester profile linked to the user.
  const { data: requester, error: requesterError } =
    await supabase
      .from("requesters")
      .select("requester_id")
      .eq("user_id", user.id)
      .single();

  if (
    requesterError?.code === "42501" ||
    requesterError?.status === 403
  ) {
    throw requestError(
      "PERMISSION_DENIED",
      "You do not have permission to access this requester profile."
    );
  }

  if (requesterError || !requester) {
    throw requestError(
      "PROFILE_NOT_FOUND",
      "The requester profile could not be found."
    );
  }

  // 5. Save the request to PostgreSQL.
  // Status, priority and timestamps use database defaults.
  const { data, error } = await supabase
    .from("service_requests")
    .insert({
      reference_number: request.referenceNumber,
      requester_id: requester.requester_id,
      category: request.category,
      title: request.title,
      description: request.description,
    })
    .select()
    .single();

  if (!error) {
    return data;
  }

  // 6. Handle duplicate reference numbers and retries.
  if (error.code === "23505") {
    const {
      data: existingRequest,
      error: lookupError,
    } = await supabase
      .from("service_requests")
      .select("*")
      .eq("reference_number", request.referenceNumber)
      .single();

    // Handle permission errors during the lookup.
    if (
      lookupError?.code === "42501" ||
      lookupError?.status === 403
    ) {
      throw requestError(
        "PERMISSION_DENIED",
        "You do not have permission to check this request."
      );
    }

    // A genuine lookup failure is not necessarily
    // a duplicate-reference conflict.
    // PGRST116 means no single row was returned.
    if (lookupError && lookupError.code !== "PGRST116") {
      throw requestError(
        "DATABASE_ERROR",
        "The existing request could not be checked."
      );
    }

    // Check whether this is a retry of the same request.
    const sameSubmission =
      !lookupError &&
      existingRequest &&
      existingRequest.requester_id === requester.requester_id &&
      existingRequest.reference_number === request.referenceNumber &&
      existingRequest.category === request.category &&
      existingRequest.title === request.title &&
      existingRequest.description === request.description;

    if (sameSubmission) {
      return existingRequest;
    }

    // Different request details, another requester,
    // or an existing record hidden by RLS.
    throw requestError(
      "REFERENCE_CONFLICT",
      "This reference number is already in use."
    );
  }

  // 7. Handle database permission errors.
  if (error.code === "42501" || error.status === 403) {
    throw requestError(
      "PERMISSION_DENIED",
      "You do not have permission to submit this request."
    );
  }

  // 8. Handle invalid database values.
  if (
    ["23502", "23503", "23514", "22P02", "22001"].includes(
      error.code
    )
  ) {
    throw requestError(
      "VALIDATION_ERROR",
      "The request contains invalid information."
    );
  }

  // 9. Handle other database failures.
  throw requestError(
    "DATABASE_ERROR",
    "The service request could not be saved."
  );
}


// Read only the signed-in requester's service requests.
export async function fetchMyServiceRequests() {
  if (!supabase) {
    throw requestError(
      "CONFIGURATION_ERROR",
      "Supabase is not configured."
    );
  }

  // Confirm the currently authenticated user.
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  const user = authData?.user;

  if (authError || !user) {
    throw requestError(
      "AUTH_REQUIRED",
      "You must sign in to view your requests."
    );
  }

  // Map auth.users.id to requesters.requester_id.
  const { data: requester, error: requesterError } =
    await supabase
      .from("requesters")
      .select("requester_id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

  if (
    requesterError?.code === "42501" ||
    requesterError?.status === 403
  ) {
    throw requestError(
      "PERMISSION_DENIED",
      "You do not have permission to access your requester profile."
    );
  }

  if (requesterError) {
    throw requestError(
      "DATABASE_ERROR",
      "Your requester profile could not be loaded."
    );
  }

  if (!requester) {
    throw requestError(
      "PROFILE_NOT_FOUND",
      "No active requester profile was found."
    );
  }

  // RLS enforces ownership independently of this filter.
  const { data: requests, error: requestsError } =
    await supabase
      .from("service_requests")
      .select(
        "service_request_id, reference_number, title, description, category, status, priority, created_at"
      )
      .eq("requester_id", requester.requester_id)
      .order("created_at", { ascending: false });

  if (
    requestsError?.code === "42501" ||
    requestsError?.status === 403
  ) {
    throw requestError(
      "PERMISSION_DENIED",
      "You do not have permission to view these requests."
    );
  }

  if (requestsError) {
    throw requestError(
      "DATABASE_ERROR",
      "Your requests could not be loaded."
    );
  }

  // An empty array is a valid result, not an error.
  return requests ?? [];
}

// Read one complaint belonging to the signed-in requester.
export async function fetchMyServiceRequestDetails(requestId) {
  if (!supabase) {
    throw requestError(
      "CONFIGURATION_ERROR",
      "Supabase is not configured."
    );
  }

  // Route IDs must be valid UUIDs.
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(requestId ?? "")) {
    throw requestError(
      "INVALID_REQUEST_ID",
      "The request identifier is invalid."
    );
  }

  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData?.user) {
    throw requestError(
      "AUTH_REQUIRED",
      "You must sign in to view request details."
    );
  }

  // Resolve the CivicConnect requester ID.
  const { data: requester, error: requesterError } =
    await supabase
      .from("requesters")
      .select("requester_id")
      .eq("user_id", authData.user.id)
      .is("deleted_at", null)
      .maybeSingle();

  if (requesterError?.code === "42501") {
    throw requestError(
      "PERMISSION_DENIED",
      "Request access was denied."
    );
  }

  if (requesterError) {
    throw requestError(
      "DATABASE_ERROR",
      "Unable to load your requester profile."
    );
  }

  if (!requester) {
    throw requestError(
      "PROFILE_NOT_FOUND",
      "Your requester profile could not be found."
    );
  }

  // Fetch only a request owned by this requester.
  const { data: request, error: requestErrorResult } =
    await supabase
      .from("service_requests")
      .select(
        [
          "service_request_id",
          "reference_number",
          "requester_id",
          "title",
          "description",
          "category",
          "status",
          "priority",
          "created_at",
          "received_at",
          "updated_at",
          "resolved_at",
          "closed_at",
          "resolution_summary",
        ].join(",")
      )
      .eq("service_request_id", requestId)
      .eq("requester_id", requester.requester_id)
      .maybeSingle();

  if (requestErrorResult?.code === "42501") {
    throw requestError(
      "PERMISSION_DENIED",
      "Request access was denied."
    );
  }

  if (requestErrorResult) {
    throw requestError(
      "DATABASE_ERROR",
      "Unable to load this request."
    );
  }

  if (!request) {
    throw requestError(
      "NOT_FOUND",
      "This request was not found or is not accessible."
    );
  }

  // Related sections are loaded separately so the main
  // request can still display if a secondary query fails.
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
        "comment_id, comment_text, author_user_id, date_created"
      )
      .eq("service_request_id", requestId)
      .eq("is_internal", false)
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
