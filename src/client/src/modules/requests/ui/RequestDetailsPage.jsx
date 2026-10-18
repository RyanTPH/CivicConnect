import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  FileText,
  MessageSquare,
} from "lucide-react";

import Card from "../../../shared/ui/Card";
import ErrorBanner from "../../../shared/ui/ErrorBanner";
import LoadingState from "../../../shared/ui/LoadingState";
import PageHeader from "../../../shared/ui/PageHeader";
import StatusBadge from "../../../shared/ui/StatusBadge";

import { getMyServiceRequestDetails } from "../service/requestService";
import RequestCommentForm from "./RequestCommentForm";

import styles from "./RequestDetailsPage.module.css";

// Display a readable date without inventing missing information.
function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getErrorMessage(error) {
  switch (error?.code) {
    case "INVALID_REQUEST_ID":
    case "NOT_FOUND":
      return "This request was not found or is not accessible.";
    case "AUTH_REQUIRED":
      return "Please sign in to view request details.";
    case "PROFILE_NOT_FOUND":
      return "Your requester profile is unavailable.";
    case "PERMISSION_DENIED":
      return "You do not have permission to view this request.";
    default:
      return "Unable to load request details. Please try again.";
  }
}

export default function RequestDetailsPage() {
  const { requestId } = useParams();

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Reload when the route ID changes or the user retries.
  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      setLoading(true);
      setError("");
      setDetails(null);

      try {
        const result = await getMyServiceRequestDetails(requestId);

        if (!cancelled) {
          setDetails(result);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(getErrorMessage(caughtError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [requestId, reloadKey]);

  const request = details?.request;

  return (
    <section className={styles.page}>
      <Link to="/requests" className={styles.backLink}>
        <ArrowLeft size={18} aria-hidden="true" />
        Back to My Requests
      </Link>

      {loading ? (
        <Card>
          <LoadingState message="Loading request details..." />
        </Card>
      ) : error ? (
        <Card>
          <div className={styles.errorPanel}>
            <ErrorBanner message={error} />

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setReloadKey((value) => value + 1)}
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
              description={`Request ${request.reference_number}`}
            />
            <StatusBadge status={request.status} />
          </div>

          <div className={styles.layout}>
            <div className={styles.mainColumn}>
              <Card>
                <h2 className={styles.sectionTitle}>
                  <FileText size={20} aria-hidden="true" />
                  Complaint Description
                </h2>

                <p className={styles.description}>{request.description}</p>

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
                    Status history is temporarily unavailable.
                  </p>
                ) : details.history.length === 0 ? (
                  <p className={styles.muted}>
                    No status history is available yet.
                  </p>
                ) : (
                  <ol className={styles.timeline}>
                    {details.history.map((entry) => (
                      <li
                        key={entry.request_status_history_id}
                        className={styles.timelineItem}
                      >
                        <span
                          className={styles.timelineMarker}
                          aria-hidden="true"
                        />

                        <div className={styles.timelineContent}>
                          <div className={styles.timelineHeading}>
                            <StatusBadge status={entry.to_status} />

                            <time>{formatDate(entry.changed_at)}</time>
                          </div>

                          {entry.note && (
                            <p className={styles.timelineNote}>{entry.note}</p>
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
                  Communication
                </h2>

                {details.commentsUnavailable ? (
                  <p className={styles.muted}>
                    Comments are temporarily unavailable.
                  </p>
                ) : details.comments.length === 0 ? (
                  <p className={styles.muted}>
                    There are no comments on this request yet.
                  </p>
                ) : (
                  <div className={styles.comments}>
                    {details.comments.map((comment) => (
                      <article
                        key={comment.comment_id}
                        className={styles.comment}
                      >
                        <p>{comment.comment_text}</p>
                        <time>{formatDate(comment.date_created)}</time>
                      </article>
                    ))}
                  </div>
                )}

                <RequestCommentForm
                  key={request.service_request_id}
                  requestId={request.service_request_id}
                  disabled={details.commentsUnavailable}
                  onCommentAdded={() => setReloadKey((current) => current + 1)}
                />
              </Card>
            </div>

            <aside className={styles.sidebar}>
              <Card>
                <h2 className={styles.sectionTitle}>Request Summary</h2>

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
                    <dd>{request.priority ?? "Not available"}</dd>
                  </div>

                  <div>
                    <dt>Current Status</dt>
                    <dd>{request.status}</dd>
                  </div>

                  <div>
                    <dt>
                      <CalendarDays size={15} aria-hidden="true" />
                      Created
                    </dt>
                    <dd>{formatDate(request.created_at)}</dd>
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

              <Link to="/requests/new" className={styles.newRequestLink}>
                File Another Complaint
              </Link>
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
