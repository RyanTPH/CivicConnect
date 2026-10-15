import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ClipboardList, Clock3, Search } from "lucide-react";

import { useAuth } from "../../auth";
import { getStaffRequests } from "../../requests";

import Card from "../../../shared/ui/Card";
import Button from "../../../shared/ui/Button";
import ErrorBanner from "../../../shared/ui/ErrorBanner";
import LoadingState from "../../../shared/ui/LoadingState";
import PageHeader from "../../../shared/ui/PageHeader";
import StatusBadge from "../../../shared/ui/StatusBadge";

import styles from "./StaffDashboardPage.module.css";

const STATUSES = [
  "Submitted",
  "Accepted",
  "In Progress",
  "Resolved",
  "Closed",
  "Rejected",
];

const CATEGORIES = [
  "Water and Sanitation",
  "Roads and Transport",
  "Electricity",
  "Waste Management",
  "Public Safety",
  "Other",
];

const PRIORITIES = ["Low", "Medium", "High"];

const ACTIVE_STATUSES = new Set(["Submitted", "Accepted", "In Progress"]);

const COMPLETED_STATUSES = new Set(["Resolved", "Closed"]);

function formatDate(value) {
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

// Staff work queue using the existing RLS-protected request query.
export default function StaffDashboardPage() {
  const { access } = useAuth();
  const staffId = access?.staff?.staff_id;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      setLoading(true);
      setError("");

      try {
        // RLS determines the staff member's visible requests.
        const result = await getStaffRequests();

        if (!cancelled) {
          setRequests(result);
        }
      } catch {
        if (!cancelled) {
          setRequests([]);
          setError("Unable to load the staff work queue. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (staffId) {
      void loadRequests();
    }

    return () => {
      cancelled = true;
    };
  }, [staffId, reloadKey]);

  const summary = useMemo(() => {
    // "Assigned" counts only requests assigned to this staff member.
    const assigned = requests.filter(
      (request) => request.assigned_staff_id === staffId,
    );

    return {
      assigned: assigned.length,
      active: assigned.filter((request) => ACTIVE_STATUSES.has(request.status))
        .length,
      completed: assigned.filter((request) =>
        COMPLETED_STATUSES.has(request.status),
      ).length,
    };
  }, [requests, staffId]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesSearch =
        !query ||
        String(request.title ?? "")
          .toLowerCase()
          .includes(query) ||
        String(request.reference_number ?? "")
          .toLowerCase()
          .includes(query);

      return (
        matchesSearch &&
        (status === "all" || request.status === status) &&
        (category === "all" || request.category === category) &&
        (priority === "all" || request.priority === priority)
      );
    });
  }, [requests, search, status, category, priority]);

  function retryLoading() {
    setReloadKey((current) => current + 1);
  }

  return (
    <section className={styles.page}>
      <PageHeader
        title="Staff Dashboard"
        description="Review the municipal service requests available to your staff account."
      />

      {!staffId ? (
        <Card>
          <ErrorBanner message="An active staff profile is required to access the staff dashboard." />
        </Card>
      ) : loading ? (
        <Card>
          <LoadingState message="Loading staff requests..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorBanner message={error} />
          <Button type="button" onClick={retryLoading}>
            Try Again
          </Button>
        </Card>
      ) : (
        <>
          <div className={styles.summaryGrid}>
            <Card>
              <div className={styles.statCard}>
                <ClipboardList size={23} aria-hidden="true" />
                <strong>{summary.assigned}</strong>
                <span>Assigned to Me</span>
              </div>
            </Card>

            <Card>
              <div className={styles.statCard}>
                <Clock3 size={23} aria-hidden="true" />
                <strong>{summary.active}</strong>
                <span>My Active Requests</span>
              </div>
            </Card>

            <Card>
              <div className={styles.statCard}>
                <CheckCircle2 size={23} aria-hidden="true" />
                <strong>{summary.completed}</strong>
                <span>My Completed Requests</span>
              </div>
            </Card>
          </div>

          <section id="queue" className={styles.queue}>
            <h2>Requests Requiring Attention</h2>

            <Card>
              <div className={styles.filters}>
                <div className={styles.field}>
                  <label htmlFor="staff-search">Search</label>
                  <div className={styles.searchControl}>
                    <Search size={18} aria-hidden="true" />
                    <input
                      id="staff-search"
                      type="search"
                      placeholder="Title or reference"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="staff-status">Status</label>
                  <select
                    id="staff-status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    <option value="all">All statuses</option>
                    {STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor="staff-category">Category</label>
                  <select
                    id="staff-category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="all">All categories</option>
                    {CATEGORIES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor="staff-priority">Priority</label>
                  <select
                    id="staff-priority"
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                  >
                    <option value="all">All priorities</option>
                    {PRIORITIES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className={styles.resultCount} role="status">
                Showing {filteredRequests.length} of {requests.length} visible
                requests
              </p>
            </Card>

            {filteredRequests.length === 0 ? (
              <Card>
                <div className={styles.empty}>
                  <ClipboardList size={32} aria-hidden="true" />
                  <h3>No matching requests</h3>
                  <p>
                    There are no requests matching your filters within your
                    authorised work queue.
                  </p>
                </div>
              </Card>
            ) : (
              <div className={styles.list}>
                {filteredRequests.map((request) => (
                  <Card key={request.service_request_id}>
                    <article className={styles.request}>
                      <div className={styles.requestInfo}>
                        <span className={styles.reference}>
                          {request.reference_number}
                        </span>

                        <h3>{request.title}</h3>

                        <p>
                          {request.category} · {formatDate(request.created_at)}
                        </p>

                        <p className={styles.priority}>
                          Priority: {request.priority ?? "Not set"}
                        </p>
                      </div>

                      <div className={styles.requestActions}>
                        <StatusBadge status={request.status} />

                        <span className={styles.assignment}>
                          {request.assigned_staff_id === staffId
                            ? "Assigned to you"
                            : request.assigned_staff_id
                              ? "Assigned to another staff member"
                              : "Unassigned"}
                        </span>

                        <Link
                          to={`/staff/requests/${encodeURIComponent(
                            request.service_request_id,
                          )}`}
                          className={styles.manageLink}
                        >
                          View / Manage →
                        </Link>
                      </div>
                    </article>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
