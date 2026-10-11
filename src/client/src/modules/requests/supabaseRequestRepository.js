import { supabase } from "../../lib/supabaseClient";

export async function saveServiceRequest(request) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  // Get the currently authenticated Supabase user.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("A signed-in requester is required to submit a request.");
  }

  // Find the requester profile linked to the authenticated user.
  const { data: requester, error: requesterError } = await supabase
    .from("requesters")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (requesterError || !requester) {
    throw new Error("The requester profile could not be found.");
  }

  if (!request.priority?.trim()) {
    throw new Error("A request priority is required.");
  }

  const { data, error } = await supabase
    .from("service_requests")
    .insert({
      reference_number: request.referenceNumber,
      requester_id: requester.id,
      category: request.category,
      priority: request.priority,
      title: request.title,
      description: request.description,
      status: "Submitted",
    })
    .select()
    .single();

  if (error) {
    throw new Error("The service request could not be saved.");
  }

  return data;
}