import { supabase } from "../../../shared/lib/supabaseClient";

// Find the current user's active requester record.
export async function findRequesterByUserId(userId) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("requesters")
    .select("requester_id, user_id, first_name, last_name, created_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;

  return data;
}

// Find the current user's active internal staff record.
export async function findStaffByUserId(userId) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("staff")
    .select("staff_id, first_name, last_name, role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;

  return data;
}