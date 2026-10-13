
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
