import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { useAuth } from "../../auth";
import { createWorkflowModule } from "../../workflows";

import Card from "../../../shared/ui/Card";
import ErrorBanner from "../../../shared/ui/ErrorBanner";
import LoadingState from "../../../shared/ui/LoadingState";
import PageHeader from "../../../shared/ui/PageHeader";
import StatusBadge from "../../../shared/ui/StatusBadge";

import styles from "./AssignmentManagementPage.module.css";

const workflow = createWorkflowModule();
const PAGE_SIZE = 20;

const CATEGORIES = [
  "Water and Sanitation",
  "Roads and Transport",
  "Electricity",
  "Waste Management",
  "Public Safety",
  "Other",
];

const PRIORITIES = ["Low", "Medium", "High"];

const OPEN_STATUSES = new Set(["Submitted", "Accepted", "In Progress"]);

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
  }).format(date);
}

// Shared assignment management screen for managers and admins.
export default function AssignmentManagementPage({ portal = "manager" }) {
  const { user, access } = useAuth();

  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [data, setData] = useState({
    key: null,
    requests: [],
    staff: [],
    error: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isManagement =
    access?.staffRole === "manager" || access?.staffRole === "admin";

  const homePath =
    portal === "admin" ? "/admin/dashboard" : "/manager/dashboard";

  // A unique key prevents showing results from another filter or user.
  const queryKey = [
    user?.id ?? "none",
    assignmentFilter,
    categoryFilter,
    priorityFilter,
    page,
    reloadKey,
  ].join(":");

  useEffect(() => {
    if (!isManagement || !user?.id) return;

    let cancelled = false;

    async function loadAssignments() {
      try {
        const [requests, staff] = await Promise.all([
          workflow.assignment.listRequests({
            assignment: assignmentFilter,
            category: categoryFilter || null,
            priority: priorityFilter || null,
            page,
            pageSize: PAGE_SIZE,
          }),
          workflow.assignment.getAssignableStaff(),
        ]);

        if (!cancelled) {
          setData({
            key: queryKey,
            requests,
            staff,
            error: "",
          });
        }
      } catch {
        if (!cancelled) {
          setData({
            key: queryKey,
            requests: [],
            staff: [],
            error: "Unable to load assignments. Please try again.",
          });
        }
      }
    }

    void loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [
    isManagement,
    user?.id,
    assignmentFilter,
    categoryFilter,
    priorityFilter,
    page,
    reloadKey,
    queryKey,
  ]);

  const loading = data.key !== queryKey;
  const requests = loading ? [] : data.requests;
  const staff = loading ? [] : data.staff;
  // Managers can select general staff or themselves.
// Administrators retain the broader oversight assignment list.
const eligibleStaff =
  access?.staffRole === "manager"
    ? staff.filter(
        (member) =>
          member.role === "staff" ||
          member.staffId === access?.staff?.staff_id
      )
    : staff;
  const error = loading ? "" : data.error;

  function refresh() {
    setEditingId(null);
    setActionError("");
    setReloadKey((value) => value + 1);
  }

  function changeFilter(setter, value) {
    setter(value);
    setPage(1);
    setEditingId(null);
    setActionError("");
    setSuccessMessage("");
  }

  function openEditor(request) {
    if (editingId === request.requestId) {
      setEditingId(null);
      return;
    }

    setEditingId(request.requestId);
    setSelectedStaffId(request.assignedStaffId || "");
    setReason("");
    setActionError("");
    setSuccessMessage("");
  }

  async function handleAssign(request) {
    if (saving || !selectedStaffId || !reason.trim()) return;

    setSaving(true);
    setActionError("");
    setSuccessMessage("");

    try {
      await workflow.assignment.assign({
        requestId: request.requestId,
        staffId: selectedStaffId,
        reason: reason.trim(),
      });

      setSuccessMessage("Request assignment saved successfully.");
      refresh();
    } catch (error) {
      setActionError(
        error?.name === "ValidationError"
          ? error.message
          : "Unable to save the assignment. Check your permissions and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUnassign(request) {
    if (saving || !request.assignedStaffId || !reason.trim()) {
      return;
    }

    setSaving(true);
    setActionError("");
    setSuccessMessage("");

    try {
      await workflow.assignment.unassign({
        requestId: request.requestId,
        reason: reason.trim(),
      });

      setSuccessMessage("Request assignment removed successfully.");
      refresh();
    } catch (error) {
      setActionError(
        error?.name === "ValidationError"
          ? error.message
          : "Unable to remove the assignment. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isManagement) {
    return (
      <ErrorBanner message="Management access is required to manage assignments." />
    );
  }

  return (
    <section className={styles.page}>
      <Link to={homePath} className={styles.backLink}>
        <ArrowLeft size={18} aria-hidden="true" />
        Back to Dashboard
      </Link>

      <PageHeader
        title="Assignment Management"
        description="Assign and reassign requests to authorised staff members."
      />

      <Card>
        <div className={styles.filters}>
          <label>
            Assignment
            <select
              value={assignmentFilter}
              onChange={(event) =>
                changeFilter(setAssignmentFilter, event.target.value)
              }
            >
              <option value="all">All requests</option>
              <option value="unassigned">Unassigned</option>
              <option value="assigned">Assigned</option>
            </select>
          </label>

          <label>
            Category
            <select
              value={categoryFilter}
              onChange={(event) =>
                changeFilter(setCategoryFilter, event.target.value)
              }
            >
              <option value="">All categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label>
            Priority
            <select
              value={priorityFilter}
              onChange={(event) =>
                changeFilter(setPriorityFilter, event.target.value)
              }
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={refresh}
            disabled={loading || saving}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </Card>

      {successMessage && (
        <p className={styles.success} role="status">
          {successMessage}
        </p>
      )}

      {loading ? (
        <Card>
          <LoadingState message="Loading assignments..." />
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
      ) : requests.length === 0 ? (
        <Card>
          <p className={styles.muted}>
            No requests match these assignment filters.
          </p>
        </Card>
      ) : (
        <div className={styles.requestList}>
          {requests.map((request) => {
            const editing = editingId === request.requestId;
            const isAssigned = Boolean(request.assignedStaffId);

            const canSave =
              Boolean(selectedStaffId) &&
              selectedStaffId !== request.assignedStaffId &&
              Boolean(reason.trim()) &&
              !saving;

            const overdue =
              request.isOverdue && OPEN_STATUSES.has(request.status);

            return (
              <Card key={request.requestId}>
                <article className={styles.requestCard}>
                  <div className={styles.requestTop}>
                    <div>
                      <span className={styles.reference}>
                        {request.referenceNumber}
                      </span>

                      <h2>{request.title}</h2>

                      <Link
                        to={`/${portal}/requests/${request.requestId}`}
                        className={styles.detailsLink}
                      >
                        View Details
                      </Link>

                      <p className={styles.muted}>
                        {request.category} · {request.priority} priority
                      </p>
                    </div>

                    <StatusBadge status={request.status} />
                  </div>

                  <div className={styles.metadata}>
                    <p>
                      <strong>Assigned to:</strong>{" "}
                      {request.assignedToName || "Unassigned"}
                    </p>

                    <p>
                      <strong>Due date:</strong> {formatDate(request.dueAt)}
                    </p>

                    {overdue && (
                      <p className={styles.overdue}>This request is overdue.</p>
                    )}
                  </div>

                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => openEditor(request)}
                    disabled={saving}
                    aria-expanded={editing}
                  >
                    {editing
                      ? "Cancel"
                      : isAssigned
                        ? "Manage Assignment"
                        : "Assign Request"}
                  </button>

                  {editing && (
                    <form
                      className={styles.editor}
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleAssign(request);
                      }}
                    >
                      <fieldset disabled={saving}>
                        <label htmlFor={`staff-${request.requestId}`}>
                          Assign to
                        </label>

                        <select
                          id={`staff-${request.requestId}`}
                          value={selectedStaffId}
                          onChange={(event) => {
                            setSelectedStaffId(event.target.value);
                            setActionError("");
                          }}
                          required
                        >
                          <option value="">Select staff member</option>

                          {eligibleStaff.map((member) => (
                            <option key={member.staffId} value={member.staffId}>
                              {[member.firstName, member.lastName]
                                .filter(Boolean)
                                .join(" ")}
                              {" — "}
                              {member.openTasks} open
                            </option>
                          ))}
                        </select>

                        <label htmlFor={`reason-${request.requestId}`}>
                          Reason for assignment
                        </label>

                        <textarea
                          id={`reason-${request.requestId}`}
                          value={reason}
                          onChange={(event) => {
                            setReason(event.target.value);
                            setActionError("");
                          }}
                          placeholder="Explain why this assignment is changing"
                          rows={3}
                          maxLength={500}
                          required
                        />

                        {actionError && (
                          <p className={styles.error} role="alert">
                            {actionError}
                          </p>
                        )}

                        <div className={styles.actions}>
                          <button
                            type="submit"
                            className={styles.primaryButton}
                            disabled={!canSave}
                          >
                            {saving
                              ? "Saving..."
                              : isAssigned
                                ? "Reassign Request"
                                : "Assign Request"}
                          </button>

                          {isAssigned && (
                            <button
                              type="button"
                              className={styles.secondaryButton}
                              disabled={saving || !reason.trim()}
                              onClick={() => void handleUnassign(request)}
                            >
                              Unassign
                            </button>
                          )}
                        </div>
                      </fieldset>
                    </form>
                  )}
                </article>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && !error && (
        <nav className={styles.pagination} aria-label="Assignment queue pages">
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={page === 1 || saving}
            onClick={() => {
              setPage((value) => value - 1);
              setEditingId(null);
            }}
          >
            Previous
          </button>

          <span>Page {page}</span>

          <button
            type="button"
            className={styles.secondaryButton}
            disabled={requests.length < PAGE_SIZE || saving}
            onClick={() => {
              setPage((value) => value + 1);
              setEditingId(null);
            }}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
