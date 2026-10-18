import { changeRequestStatus } from "../repository/supabaseRequestStatusRepository";
import { publish } from "../../../shared/events/eventBus";

const VALID_STATUSES = [
  "Submitted",
  "Accepted",
  "Rejected",
  "In Progress",
  "Resolved",
  "Closed",
];

export async function updateRequestStatus(requestId, newStatus, note) {
  if (typeof newStatus !== "string" || !VALID_STATUSES.includes(newStatus.trim())) {
    throw new Error("Invalid request status.");
  }

  if (typeof note !== "string" || !note.trim()) {
    throw new Error("A note is required when changing request status.");
  }

  const status = newStatus.trim();

  await changeRequestStatus(requestId, status, note.trim());

  // Publish only after the database confirms the change.
  publish("request.statusChanged", {
    requestId,
    newStatus: status,
  });
}