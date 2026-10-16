import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, RefreshCw, UserRound } from "lucide-react";

import { useAuth } from "../../auth";
import { createWorkflowModule } from "../../workflows";

import Card from "../../../shared/ui/Card";
import ErrorBanner from "../../../shared/ui/ErrorBanner";
import LoadingState from "../../../shared/ui/LoadingState";
import PageHeader from "../../../shared/ui/PageHeader";
import StatusBadge from "../../../shared/ui/StatusBadge";

import styles from "./StaffDetailsPage.module.css";

// Use the existing repository and team service.
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

function displayName(member) {
  return (
    [member?.firstName, member?.lastName].filter(Boolean).join(" ") ||
    "Unnamed Staff Member"
  );
}

// Shared page for management and administration.
export default function StaffDetailsPage({ portal = "manager" }) {
  const { staffId } = useParams();
  const { user, access } = useAuth();

  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState({
    key: null,
    data: null,
    error: "",
  });

  const authorised =
    access?.staffRole === "manager" || access?.staffRole === "admin";

  const teamPath = `/${portal}/team`;
  const assignmentsPath = `/${portal}/assignments`;

  // Tie loaded data to the current user, staff ID and refresh.
  const queryKey = [user?.id ?? "none", staffId ?? "none", reloadKey].join(":");

  useEffect(() => {
    if (!user?.id || !authorised || !staffId) return;

    let cancelled = false;

    async function loadDetails() {
      try {
        const data = await workflow.team.getStaffDetail(staffId);

        if (!cancelled) {
          setResult({
            key: queryKey,
            data,
            error: "",
          });
        }
      } catch (error) {
        if (!cancelled) {
          setResult({
            key: queryKey,
            data: null,
            error:
              error?.name === "NotFoundError"
                ? "This staff member could not be found."
                : error?.name === "ValidationError"
                  ? "Invalid staff member ID."
                  : "Unable to load staff details. Please try again.",
          });
        }
      }
    }

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authorised, staffId, queryKey]);

  function refresh() {
    setReloadKey((current) => current + 1);
  }

  if (!authorised) {
    return <ErrorBanner message="Management access is required." />;
  }

  const loading = result.key !== queryKey;
  const details = loading ? null : result.data;
  const error = loading ? "" : result.error;

  const summary = details?.summary;
  const tasks = details?.tasks ?? [];
  const history = details?.history ?? [];

  return (
    <section className={styles.page}>
      <Link to={teamPath} className={styles.backLink}>
        <ArrowLeft size={18} aria-hidden="true" />
        Back to Team Overview
      </Link>

      <PageHeader
        title={summary ? displayName(summary) : "Staff Details"}
        description="Review staff workload, assigned requests and assignment history."
        action={
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={refresh}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Refresh
          </button>
        }
      />

      {loading ? (
        <Card>
          <LoadingState message="Loading staff details..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorBanner message={error} />
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={refresh}
          >
            Try Again
          </button>
        </Card>
      ) : !summary ? (
        <Card>
          <p className={styles.muted}>
            No staff information is available for this record.
          </p>
        </Card>
      ) : (
        <>
          {/* Staff identity and current account status. */}
          <Card>
            <div className={styles.identity}>
              <div className={styles.identityIcon}>
                <UserRound size={24} aria-hidden="true" />
              </div>

              <div className={styles.identityText}>
                <h2>{displayName(summary)}</h2>

                <p>{summary.department || "Department not assigned"}</p>

                <div className={styles.identityTags}>
                  <span className={styles.roleTag}>{summary.role}</span>

                  <span
                    className={
                      summary.isActive ? styles.activeTag : styles.inactiveTag
                    }
                  >
                    {summary.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Counts are supplied by staff_task_summary(). */}
          <div className={styles.metrics}>
            {[
              ["Assigned Open", summary.assignedOpen],
              ["In Progress", summary.inProgress],
              ["Overdue", summary.overdue],
              ["Resolved / Closed", summary.resolved],
            ].map(([label, value]) => (
              <Card key={label}>
                <div className={styles.metric}>
                  <strong>{value ?? 0}</strong>
                  <span>{label}</span>
                </div>
              </Card>
            ))}
          </div>

          <div className={styles.sectionHeading}>
            <h2>Assigned Requests</h2>
            <Link to={assignmentsPath} className={styles.secondaryButton}>
              <ClipboardList size={17} aria-hidden="true" />
              Manage Assignments
            </Link>
          </div>

          {tasks.length === 0 ? (
            <Card>
              <p className={styles.muted}>
                No current requests are assigned to this staff member.
              </p>
            </Card>
          ) : (
            <div className={styles.taskList}>
              {tasks.map((task) => (
                <Card key={task.requestId}>
                  <article className={styles.task}>
                    <div className={styles.taskHeader}>
                      <div>
                        <span className={styles.reference}>
                          {task.referenceNumber}
                        </span>

                        <h3>{task.title}</h3>

                        <Link
                          to={`/${portal}/requests/${task.requestId}`}
                          className={styles.detailsLink}
                        >
                          View Request Details
                        </Link>
                      </div>

                      <StatusBadge status={task.status} />
                    </div>

                    <div className={styles.taskMetadata}>
                      <p>
                        <strong>Category:</strong>{" "}
                        {task.category || "Not specified"}
                      </p>

                      <p>
                        <strong>Priority:</strong>{" "}
                        {task.priority || "Not specified"}
                      </p>

                      <p>
                        <strong>Due:</strong> {formatDate(task.dueAt)}
                      </p>

                      <p>
                        <strong>Assigned:</strong> {formatDate(task.assignedAt)}
                      </p>
                    </div>

                    {task.isOverdue && (
                      <p className={styles.overdue}>
                        <span aria-hidden="true">!</span> Overdue request
                      </p>
                    )}
                  </article>
                </Card>
              ))}
            </div>
          )}

          <div className={styles.sectionHeading}>
            <h2>Assignment History</h2>
          </div>

          <Card>
            {history.length === 0 ? (
              <p className={styles.muted}>
                No assignment history has been recorded for this staff member.
              </p>
            ) : (
              <ol className={styles.historyList}>
                {history.map((entry) => (
                  <li key={entry.assignmentId} className={styles.historyEntry}>
                    <div className={styles.historyHeading}>
                      <strong>
                        {entry.referenceNumber || "Service Request"}
                      </strong>

                      <span>
                        {entry.unassignedAt
                          ? "Assignment ended"
                          : "Assignment active"}
                      </span>
                    </div>

                    <dl className={styles.historyDetails}>
                      <div>
                        <dt>Assigned on</dt>
                        <dd>{formatDate(entry.assignedAt)}</dd>
                      </div>

                      <div>
                        <dt>Assigned by</dt>
                        <dd>{entry.assignedByName || "Not recorded"}</dd>
                      </div>

                      {entry.unassignedAt && (
                        <>
                          <div>
                            <dt>Ended on</dt>
                            <dd>{formatDate(entry.unassignedAt)}</dd>
                          </div>

                          <div>
                            <dt>Ended by</dt>
                            <dd>{entry.unassignedByName || "Not recorded"}</dd>
                          </div>
                        </>
                      )}
                    </dl>

                    {entry.reason && (
                      <p className={styles.reason}>
                        <strong>Reason:</strong> {entry.reason}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </>
      )}
    </section>
  );
}
