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

