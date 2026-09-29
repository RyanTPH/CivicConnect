import { supabase } from "../../lib/supabaseClient";

export async function saveServiceRequest(request) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data: category, error: categoryError } = await supabase
    .from("request_categories")
    .select("id")
    .eq("name", request.category)
    .eq("is_active", true)
    .single();

  if (categoryError) {
    throw new Error("The selected request category is not available.");
  }

  const { data: status, error: statusError } = await supabase
    .from("request_statuses")
    .select("id")
    .eq("name", "Submitted")
    .single();

  if (statusError) {
    throw new Error("The initial request status could not be found.");
  }

  const { data, error } = await supabase
    .from("service_requests")
    .insert({
      reference_number: request.referenceNumber,
      category_id: category.id,
      title: request.title,
      description: request.description,
      status_id: status.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error("The service request could not be saved.");
  }

  return data;
}