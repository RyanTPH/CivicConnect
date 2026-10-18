import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { useAuth } from "../../auth";
import { getStaffRequestDetails } from "../../requests";
import { createWorkflowModule } from "../../workflows";

import Card from "../../../shared/ui/Card";
import ErrorBanner from "../../../shared/ui/ErrorBanner";
import LoadingState from "../../../shared/ui/LoadingState";
import PageHeader from "../../../shared/ui/PageHeader";
import StatusBadge from "../../../shared/ui/StatusBadge";

import styles from "./ManagementRequestDetailsPage.module.css";

const workflow = createWorkflowModule();

function formatDate(value) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(date);
}

// Shared read-only request details for manager and admin.
export default function ManagementRequestDetailsPage({
  portal = "manager",
}) {
  const { requestId } = useParams();
  const { user, access } = useAuth();

  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({
    key: null,
    details: null,
    assignments: [],
    error: "",
    assignmentError: false,
  });

  const authorised =
    access?.isStaff &&
    (access.staffRole === "manager" ||
      access.staffRole === "admin");

  const queryKey = [
    user?.id ?? "none",
    requestId ?? "none",
    reloadKey,
  ].join(":");

  const dashboardPath = `/${portal}/dashboard`;
  const assignmentsPath = `/${portal}/assignments`;

  useEffect(() => {
    if (!authorised || !user?.id || !requestId) return;

    let cancelled = false;

    async function loadDetails() {
      try {
        // The shared reader uses existing table RLS policies.
        const details = await getStaffRequestDetails(requestId);

        // Assignment history has its own management-only RPC.
        const assignmentResult = await Promise.allSettled([
          workflow.assignment.getRequestHistory(requestId),
        ]);

        if (cancelled) return;

        const historyResult = assignmentResult[0];

        setState({
          key: queryKey,
          details,
          assignments:
            historyResult.status === "fulfilled"
              ? historyResult.value
              : [],
          assignmentError:
            historyResult.status === "rejected",
          error: "",
        });
      } catch {
        if (!cancelled) {
          setState({
            key: queryKey,
            details: null,
            assignments: [],
            assignmentError: false,
            error:
              "Unable to load this request. It may not be accessible to your account.",
          });
        }
      }
    }

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [authorised, user?.id, requestId, queryKey]);

  function refresh() {
    setReloadKey((current) => current + 1);
  }

  if (!authorised) {
    return (
      <ErrorBanner
        message="Manager or administrator access is required."
      />
    );
  }

  const loading = state.key !== queryKey;
  const error = loading ? "" : state.error;
  const details = loading ? null : state.details;

  const request = details?.request;
  const history = details?.history ?? [];
  const comments = details?.comments ?? [];
  const assignments = loading ? [] : state.assignments;

  return (
    <section className={styles.page}>
      <Link to={dashboardPath} className={styles.backLink}>
        <ArrowLeft size={18} aria-hidden="true" />
        Back to Dashboard
      </Link>

      <PageHeader
        title={
          request?.reference_number ||
          "Request Details"
        }
        description="Review the request, processing history and assignment activity."
        action={
          <button
            type="button"
            className={styles.action}
            onClick={refresh}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Refresh
          </button>
        }
      />

      {loading ? (
        <Card>
          <LoadingState message="Loading request details..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorBanner message={error} />
          <button
            type="button"
            className={styles.action}
            onClick={refresh}
          >
            Try Again
          </button>
        </Card>
      ) : request ? (
        <>
          <div className={styles.heading}>
            <div>
              <h2>{request.title}</h2>
              <p>
                {request.category} ·{" "}
                {request.priority || "Unspecified"} priority
              </p>
            </div>

            <StatusBadge status={request.status} />
          </div>

          <div className={styles.columns}>
            <div className={styles.mainColumn}>
              <Card title="Request Description">
                <p className={styles.description}>
                  {request.description ||
                    "No description provided."}
                </p>

                {request.resolution_summary && (
                  <div className={styles.resolution}>
                    <h3>Resolution Summary</h3>
                    <p>{request.resolution_summary}</p>
                  </div>
                )}
              </Card>

              <Card title="Status History">
                {details.historyUnavailable && (
                  <p className={styles.warning} role="status">
                    Status history could not be loaded.
                  </p>
                )}

                {history.length === 0 ? (
                  <p className={styles.muted}>
                    No status changes are available.
                  </p>
                ) : (
                  <ol className={styles.timeline}>
                    {history.map((entry) => (
                      <li key={entry.request_status_history_id}>
                        <strong>
                          {entry.from_status || "Created"}
                          {" → "}
                          {entry.to_status}
                        </strong>

                        <time>
                          {formatDate(entry.changed_at)}
                        </time>

                        {entry.note && (
                          <p>{entry.note}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </Card>

              <Card title="Assignment History">
                {state.assignmentError && (
                  <p className={styles.warning} role="status">
                    Assignment history could not be loaded.
                  </p>
                )}

                {assignments.length === 0 ? (
                  <p className={styles.muted}>
                    No assignment records are available.
                  </p>
                ) : (
                  <ol className={styles.timeline}>
                    {assignments.map((entry) => (
                      <li key={entry.assignmentId}>
                        <strong>
                          {entry.assignedToName ||
                            "Unnamed staff member"}
                        </strong>

                        <p>
                          Assigned:{" "}
                          {formatDate(entry.assignedAt)}
                        </p>

                        <p>
                          By:{" "}
                          {entry.assignedByName ||
                            "Not recorded"}
                        </p>

                        {entry.unassignedAt && (
                          <p>
                            Unassigned:{" "}
                            {formatDate(entry.unassignedAt)}
                          </p>
                        )}

                        {entry.unassignedByName && (
                          <p>
                            Unassigned by:{" "}
                            {entry.unassignedByName}
                          </p>
                        )}

                        {entry.reason && (
                          <p>
                            Reason: {entry.reason}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </Card>

              <Card title="Comments">
                {details.commentsUnavailable && (
                  <p className={styles.warning} role="status">
                    Comments could not be loaded.
                  </p>
                )}

                {comments.length === 0 ? (
                  <p className={styles.muted}>
                    No comments are available.
                  </p>
                ) : (
                  <div className={styles.comments}>
                    {comments.map((comment) => (
                      <article
                        key={comment.comment_id}
                        className={styles.comment}
                      >
                        <div className={styles.commentHeading}>
                          <strong>
                            {comment.is_internal
                              ? "Internal staff note"
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

              </Card>
            </div>

            <aside className={styles.sidebar}>
              <Card title="Request Summary">
                <dl className={styles.summary}>
                  {[
                    ["Reference", request.reference_number],
                    ["Category", request.category],
                    ["Priority", request.priority],
                    ["Status", request.status],
                    ["Created", formatDate(request.created_at)],
                    ["Received", formatDate(request.received_at)],
                    ["Due", formatDate(request.due_at)],
                    ["Updated", formatDate(request.updated_at)],
                    ["Resolved", formatDate(request.resolved_at)],
                    ["Closed", formatDate(request.closed_at)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value || "Not recorded"}</dd>
                    </div>
                  ))}
                </dl>
              </Card>

              <Card title="Assignment">
                <p className={styles.muted}>
                  {request.assigned_staff_id
                    ? "This request is assigned to a staff member."
                    : "This request is currently unassigned."}
                </p>

                <Link
                  to={assignmentsPath}
                  className={styles.actionLink}
                >
                  Manage Assignments
                </Link>
              </Card>
            </aside>
          </div>
        </>
      ) : (
        <Card>
          <p className={styles.muted}>
            Request details are unavailable.
          </p>
        </Card>
      )}
    </section>
  );
}