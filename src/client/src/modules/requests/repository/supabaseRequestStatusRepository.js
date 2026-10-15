
import { supabase } from "../../../shared/lib/supabaseClient";

export async function changeRequestStatus(requestId, newStatus, note) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  if (
    typeof requestId !== "string" ||
    !requestId.trim() ||
    typeof newStatus !== "string" ||
    !newStatus.trim() ||
    typeof note !== "string" ||
    !note.trim()
  ) {
    throw new Error("Request ID, new status and note are required.");
  }

  const { error } = await supabase.rpc("change_request_status", {
    p_request_id: requestId.trim(),
    p_new_status: newStatus.trim(),
    p_note: note.trim(),
  });

  if (error) {
    throw new Error(`Unable to change request status: ${error.message}`);
  }
}
