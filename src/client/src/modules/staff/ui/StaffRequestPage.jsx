import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Clock3,
  MessageSquare,
  UserRound,
} from "lucide-react";

import { useAuth } from "../../auth";
import { getStaffRequestDetails, updateRequestStatus, assignStaffRequest, } from "../../requests";

import Card from "../../../shared/ui/Card";
import ErrorBanner from "../../../shared/ui/ErrorBanner";
import LoadingState from "../../../shared/ui/LoadingState";
import PageHeader from "../../../shared/ui/PageHeader";
import StatusBadge from "../../../shared/ui/StatusBadge";

import styles from "./StaffRequestPage.module.css";

// Format timestamps consistently with the other CivicConnect pages.
function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}


// General-staff transitions from the current workflow migration.
const STAFF_STATUS_TRANSITIONS = {
  Submitted: ["Accepted", "Rejected"],
  Accepted: ["In Progress"],
  "In Progress": ["Resolved"],
  Resolved: ["Closed"],
  Closed: [],
  Rejected: [],
};


export default function StaffRequestPage() {
  const { requestId } = useParams();
  const { access } = useAuth();

  const staffId = access?.staff?.staff_id;

  const [loadState, setLoadState] = useState({
    requestId: null,
    result: null,
    error: "",
  });
  const [reloadKey, setReloadKey] = useState(0);


  // Keep assignment and status-change forms independent.
const [claimReason, setClaimReason] = useState("");
const [claimSaving, setClaimSaving] = useState(false);
const [claimError, setClaimError] = useState("");
const [claimMessage, setClaimMessage] = useState("");

const [nextStatus, setNextStatus] = useState("");
const [statusNote, setStatusNote] = useState("");
const [statusSaving, setStatusSaving] = useState(false);
const [statusError, setStatusError] = useState("");
const [statusMessage, setStatusMessage] = useState("");


  // Load the selected request without synchronously setting state
  // inside the effect, avoiding cascading-render lint warnings.
  useEffect(() => {
    let cancelled = false;

    getStaffRequestDetails(requestId)
      .then((result) => {
        if (cancelled) return;

        setLoadState({
          requestId,
          result,
          error: "",
        });
      })
      .catch(() => {
        if (cancelled) return;

        setLoadState({
          requestId,
          result: null,
          error:
            "This request could not be loaded. It may be unavailable or inaccessible to your account.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [requestId, reloadKey]);

  function reloadDetails() {
    setLoadState({
      requestId: null,
      result: null,
      error: "",
    });

    setReloadKey((current) => current + 1);
  }

  // Claim an eligible request using the protected assignment RPC.
async function handleClaimRequest() {
  if (!canClaim || claimSaving) return;

  const reason = claimReason.trim();

  setClaimError("");
  setClaimMessage("");

  if (!reason) {
    setClaimError("Please provide a reason for claiming this request.");
    return;
  }

  setClaimSaving(true);

  try {
    await assignStaffRequest(
      request.service_request_id,
      staffId,
      reason
    );

    setClaimReason("");
    setClaimMessage("Request assigned to you successfully.");
    reloadDetails();
  } catch (error) {
    setClaimError(
      error?.message ||
        "Unable to claim this request. It may already be assigned."
    );
  } finally {
    setClaimSaving(false);
  }
}

// Change status and refresh the request after a successful RPC.
async function handleUpdateStatus() {
  if (
    !isAssignedToMe ||
    !selectedNextStatus ||
    statusSaving
  ) {
    return;
  }

  const note = statusNote.trim();

  setStatusError("");
  setStatusMessage("");

  if (!note) {
    setStatusError("Please enter a reason for the status change.");
    return;
  }

  setStatusSaving(true);

  try {
    await updateRequestStatus(
      request.service_request_id,
      selectedNextStatus,
      note
    );

    setNextStatus("");
    setStatusNote("");
    setStatusMessage("Request status updated successfully.");
    reloadDetails();
  } catch (error) {
    setStatusError(
      error?.message ||
        "Unable to update the request status. Please try again."
    );
  } finally {
    setStatusSaving(false);
  }
}

  // A previous request must never appear while another ID is loading.
  const isLoading = loadState.requestId !== requestId;
  const details = loadState.result;
  const request = details?.request;

  const isAssignedToMe =
    Boolean(staffId) &&
    request?.assigned_staff_id === staffId;

    // General staff may only claim eligible unassigned requests.
const canClaim =
  Boolean(staffId) &&
  Boolean(request) &&
  !request.assigned_staff_id &&
  !["Closed", "Rejected"].includes(request.status);

// Staff may update only requests currently assigned to them.
const allowedNextStatuses = isAssignedToMe
  ? STAFF_STATUS_TRANSITIONS[request?.status] ?? []
  : [];

// Avoid using a status selection from a previous request state.
const selectedNextStatus =
  allowedNextStatuses.includes(nextStatus) ? nextStatus : "";

  function assignmentLabel() {
    if (!request?.assigned_staff_id) {
      return "Unassigned";
    }

    return isAssignedToMe
      ? "Assigned to you"
      : "Assigned to another staff member";
  }

  return (
    <section className={styles.page}>
      <Link
        to="/staff/dashboard"
        className={styles.backLink}
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Back to Staff Dashboard
      </Link>

      {isLoading ? (
        <Card>
          <LoadingState message="Loading request details..." />
        </Card>
      ) : loadState.error ? (
        <Card>
          <div className={styles.errorPanel}>
            <ErrorBanner message={loadState.error} />

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={reloadDetails}
            >
              Try Again
            </button>
          </div>
        </Card>
      ) : request ? (
        <>
          <div className={styles.header}>
            <PageHeader
              title={request.title}
              description={`Reference: ${request.reference_number}`}
            />

            <StatusBadge status={request.status} />
          </div>

          <div className={styles.layout}>
            <div className={styles.mainColumn}>
              <Card>
                <h2 className={styles.sectionTitle}>
                  <ClipboardList size={20} aria-hidden="true" />
                  Complaint Details
                </h2>

                <p className={styles.description}>
                  {request.description}
                </p>

                {request.resolution_summary && (
                  <div className={styles.resolution}>
                    <h3>Resolution Summary</h3>
                    <p>{request.resolution_summary}</p>
                  </div>
                )}
              </Card>

              <Card>
                <h2 className={styles.sectionTitle}>
                  <Clock3 size={20} aria-hidden="true" />
                  Status History
                </h2>

                {details.historyUnavailable ? (
                  <p className={styles.muted}>
                    Status history could not be loaded.
                  </p>
                ) : details.history.length === 0 ? (
                  <p className={styles.muted}>
                    No status history is available.
                  </p>
                ) : (
                  <ol className={styles.timeline}>
                    {details.history.map((entry) => (
                      <li
                        key={entry.request_status_history_id}
                        className={styles.timelineItem}
                      >
                        <span
                          className={styles.timelineDot}
                          aria-hidden="true"
                        />

                        <div className={styles.timelineBody}>
                          <div className={styles.timelineHeader}>
                            <StatusBadge status={entry.to_status} />

                            <time>
                              {formatDate(entry.changed_at)}
                            </time>
                          </div>

                          {entry.note && (
                            <p className={styles.description}>
                              {entry.note}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>

              <Card>
                <h2 className={styles.sectionTitle}>
                  <MessageSquare size={20} aria-hidden="true" />
                  Request Communication
                </h2>

                {details.commentsUnavailable ? (
                  <p className={styles.muted}>
                    Comments could not be loaded.
                  </p>
                ) : details.comments.length === 0 ? (
                  <p className={styles.muted}>
                    No comments have been recorded.
                  </p>
                ) : (
                  <div className={styles.comments}>
                    {details.comments.map((comment) => (
                      <article
                        key={comment.comment_id}
                        className={styles.comment}
                      >
                        <div className={styles.commentHeader}>
                          <strong>
                            {comment.is_internal
                              ? "Internal Note"
                              : "Comment"}
                          </strong>

                          <time>
                            {formatDate(comment.date_created)}
                          </time>
                        </div>

                        <p>{comment.comment_text}</p>
                      </article>
                    ))}
                  </div>
                )}

                <p className={styles.muted}>
                  Adding comments will be enabled after the
                  staff comment-write permissions are verified.
                </p>
              </Card>
            </div>

            <aside className={styles.sidebar}>
              <Card>
                <h2 className={styles.sectionTitle}>
                  Request Summary
                </h2>

                <dl className={styles.summary}>
                  <div>
                    <dt>Reference Number</dt>
                    <dd>{request.reference_number}</dd>
                  </div>

                  <div>
                    <dt>Category</dt>
                    <dd>{request.category}</dd>
                  </div>

                  <div>
                    <dt>Priority</dt>
                    <dd>{request.priority}</dd>
                  </div>

                  <div>
                    <dt>Current Status</dt>
                    <dd>{request.status}</dd>
                  </div>

                  <div>
                    <dt>
                      <CalendarDays
                        size={15}
                        aria-hidden="true"
                      />
                      Created
                    </dt>
                    <dd>{formatDate(request.created_at)}</dd>
                  </div>

                  <div>
                    <dt>Due Date</dt>
                    <dd>{formatDate(request.due_at)}</dd>
                  </div>

                  <div>
                    <dt>Last Updated</dt>
                    <dd>{formatDate(request.updated_at)}</dd>
                  </div>

                  {request.resolved_at && (
                    <div>
                      <dt>Resolved</dt>
                      <dd>{formatDate(request.resolved_at)}</dd>
                    </div>
                  )}

                  {request.closed_at && (
                    <div>
                      <dt>Closed</dt>
                      <dd>{formatDate(request.closed_at)}</dd>
                    </div>
                  )}
                </dl>
              </Card>

              <Card>
                <h2 className={styles.sectionTitle}>
                  <UserRound size={20} aria-hidden="true" />
                  Assignment
                </h2>

                <p className={styles.assignmentValue}>
                  {assignmentLabel()}
                </p>


                {canClaim && (
  <div className={styles.workflowForm}>
    <label htmlFor="claim-reason">
      Reason for Claiming
    </label>

    <textarea
      id="claim-reason"
      className={styles.workflowInput}
      value={claimReason}
      onChange={(event) => {
        setClaimReason(event.target.value);
        setClaimError("");
      }}
      placeholder="e.g. Assigned to the Water department"
      rows={3}
      maxLength={500}
      disabled={claimSaving}
      required
    />

    {claimError && (
      <p className={styles.workflowError} role="alert">
        {claimError}
      </p>
    )}

    <button
      type="button"
      className={styles.secondaryButton}
      onClick={handleClaimRequest}
      disabled={claimSaving || !claimReason.trim()}
    >
      {claimSaving ? "Claiming..." : "Claim Request"}
    </button>
  </div>
)}

{claimMessage && (
  <p className={styles.workflowSuccess} role="status">
    {claimMessage}
  </p>
)}

{!canClaim && !isAssignedToMe && (
  <p className={styles.actionNote}>
    This request is not available for self-assignment.
  </p>
)}
              </Card>

              <Card>
                <h2 className={styles.sectionTitle}>
                  Update Request Status
                </h2>

                <div className={styles.currentStatus}>
                  <span>Current status</span>
                  <StatusBadge status={request.status} />
                </div>


{isAssignedToMe && allowedNextStatuses.length > 0 ? (
  <div className={styles.workflowForm}>
    <label htmlFor="staff-next-status">
      Change Status To
    </label>

    <select
      id="staff-next-status"
      className={styles.workflowInput}
      value={selectedNextStatus}
      onChange={(event) => {
        setNextStatus(event.target.value);
        setStatusError("");
      }}
      disabled={statusSaving}
    >
      <option value="">Select next status</option>

      {allowedNextStatuses.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>

    <label htmlFor="staff-status-note">
      Reason / Progress Note
    </label>

    <textarea
      id="staff-status-note"
      className={styles.workflowInput}
      value={statusNote}
      onChange={(event) => {
        setStatusNote(event.target.value);
        setStatusError("");
      }}
      placeholder="Describe the action taken or reason for the update"
      rows={4}
      maxLength={1000}
      disabled={statusSaving}
      required
    />

    {statusError && (
      <p className={styles.workflowError} role="alert">
        {statusError}
      </p>
    )}

    <button
      type="button"
      className={styles.primaryButton}
      onClick={handleUpdateStatus}
      disabled={
        statusSaving ||
        !selectedNextStatus ||
        !statusNote.trim()
      }
    >
      {statusSaving ? "Updating..." : "Update Status"}
    </button>
  </div>
) : (
  <p className={styles.actionNote}>
    {!isAssignedToMe
      ? "Only the assigned staff member can change this request's status."
      : "No further general-staff status transitions are available."}
  </p>
)}

{statusMessage && (
  <p className={styles.workflowSuccess} role="status">
    {statusMessage}
  </p>
)}
                
              </Card>
            </aside>
          </div>
        </>
      ) : (
        <Card>
          <p>Request details are unavailable.</p>
        </Card>
      )}
    </section>
  );
}