import { supabase } from "../../../shared/lib/supabaseClient";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_COMMENT_LENGTH = 2000;

// Save a comment as the currently authenticated user.
// Ownership and internal-note permissions are enforced by RLS.
export async function createRequestComment({
  requestId,
  text,
  isInternal = false,
}) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  if (!UUID_PATTERN.test(requestId ?? "")) {
    throw new Error("Invalid service request.");
  }

  const commentText =
    typeof text === "string" ? text.trim() : "";

  if (!commentText) {
    throw new Error("Please enter a comment.");
  }

  if (commentText.length > MAX_COMMENT_LENGTH) {
    throw new Error(
      `Comments must be ${MAX_COMMENT_LENGTH} characters or fewer.`
    );
  }

  if (typeof isInternal !== "boolean") {
    throw new Error("Invalid comment visibility.");
  }

  const { data: auth, error: authError } =
    await supabase.auth.getUser();

  if (authError || !auth?.user) {
    throw new Error("Please sign in to comment.");
  }

  const { error } = await supabase.from("comments").insert({
    service_request_id: requestId,
    author_user_id: auth.user.id,
    comment_text: commentText,
    is_internal: isInternal,
  });

  if (error) {
    if (
      error.code === "42501" ||
      error.status === 403
    ) {
      throw new Error(
        "You do not have permission to comment on this request."
      );
    }

    if (
      ["23502", "23503", "23514", "22001"].includes(
        error.code
      )
    ) {
      throw new Error("The comment could not be accepted.");
    }

    // Avoid exposing raw database details in the UI.
    throw new Error(
      "Unable to post your comment. Please try again."
    );
  }
}