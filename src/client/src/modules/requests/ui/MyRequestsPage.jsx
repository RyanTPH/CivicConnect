import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FilePlus2, FileText, Search } from "lucide-react";

import Button from "../../../shared/ui/Button";
import Card from "../../../shared/ui/Card";
import EmptyState from "../../../shared/ui/EmptyState";
import ErrorBanner from "../../../shared/ui/ErrorBanner";
import LoadingState from "../../../shared/ui/LoadingState";
import PageHeader from "../../../shared/ui/PageHeader";
import StatusBadge from "../../../shared/ui/StatusBadge";

import { listMyServiceRequests } from "../service/requestService";

import styles from "./MyRequestsPage.module.css";
import {useAuth} from "../../auth";

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

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

// Translate repository errors into useful page feedback.
function getErrorMessage(error) {
  switch (error?.code) {
    case "AUTH_REQUIRED":
      return "Your session has expired. Please sign in again.";

    case "PROFILE_NOT_FOUND":
      return "Your requester profile could not be found.";

    case "PERMISSION_DENIED":
      return "You do not have permission to view these requests.";

    case "CONFIGURATION_ERROR":
      return "The request service is not configured.";

    default:
      return "Unable to load your requests. Please try again.";
  }
}

// Requester-facing page for browsing submitted service requests.
export default function MyRequestsPage() {

  const { access } = useAuth();
  // Get the signed-in user's first name.
const firstName = access?.requester?.first_name?.trim() || "Requester";

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  // Dashboard summaries based on the same loaded requests.
    const summary = useMemo(() => {
      const activeStatuses = new Set(["Submitted", "Accepted", "In Progress"]);

      const completedStatuses = new Set(["Resolved", "Closed"]);

      return {
        total: requests.length,
        active: requests.filter((request) => activeStatuses.has(request.status))
          .length,
        completed: requests.filter((request) =>
          completedStatuses.has(request.status),
        ).length,
      };
    }, [requests]);

  // Load requests when the page opens or the user retries.
  useEffect(() => {
    let cancelled = false;


    //List all user requests
    listMyServiceRequests()
      .then((data) => {
        if (cancelled) return;

        setRequests(data);
        setError("");
      })
      .catch((requestError) => {
        if (cancelled) return;

        setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retryLoading() {
    setError("");
    setLoading(true);
    setReloadKey((current) => current + 1);
  }

  // Search and filters are presentation concerns for this page.
  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = requests.filter((request) => {
      const matchesSearch =
        !query ||
        String(request.title ?? "")
          .toLowerCase()
          .includes(query) ||
        String(request.reference_number ?? "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" || request.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all" || request.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    return filtered.sort((a, b) => {
      const dateA = Date.parse(a.created_at) || 0;
      const dateB = Date.parse(b.created_at) || 0;

      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [requests, search, statusFilter, categoryFilter, sortOrder]);

  const filtersActive =
    search.trim() !== "" || statusFilter !== "all" || categoryFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setSortOrder("newest");
  }

  return (
    <section className={styles.page}>
      <PageHeader
        title={`Welcome Back, ${firstName}!`}
        description="Manage and track your municipal service requests."
        action={
          <Link to="/requests/new" className={styles.newRequest}>
            <FilePlus2 size={18} aria-hidden="true" />
            File a Complaint
          </Link>
        }
      />

      {!loading && !error && (
        <div className={styles.summaryGrid}>
          <Card>
            <div className={styles.summaryCard}>
              <span>Total Requests</span>
              <strong>{summary.total}</strong>
            </div>
          </Card>

          <Card>
            <div className={styles.summaryCard}>
              <span>Active Requests</span>
              <strong>{summary.active}</strong>
            </div>
          </Card>

          <Card>
            <div className={styles.summaryCard}>
              <span>Completed Requests</span>
              <strong>{summary.completed}</strong>
            </div>
          </Card>
        </div>
      )}

      <section id="requests" className={styles.requestsSection}>
        <h2>My Service Requests</h2>

        {loading ? (
          <Card>
            <LoadingState message="Loading your requests..." />
          </Card>
        ) : error ? (
          <Card>
            <div className={styles.errorContent}>
              <ErrorBanner message={error} />

              <Button type="button" onClick={retryLoading}>
                Try Again
              </Button>

              {error.includes("sign in") && (
                <Link to="/login">Go to Login</Link>
              )}
            </div>
          </Card>
        ) : requests.length === 0 ? (
          <Card>
            <EmptyState
              icon={FileText}
              title="No requests yet"
              description="You haven't submitted any service requests yet."
              action={
                <Link to="/requests/new" className={styles.newRequest}>
                  File Your First Complaint
                </Link>
              }
            />
          </Card>
        ) : (
          <>
            <Card>
              <div className={styles.filters}>
                <div className={styles.searchField}>
                  <label htmlFor="requests-search">Search Requests</label>

                  <div className={styles.searchControl}>
                    <Search size={18} aria-hidden="true" />

                    <input
                      id="requests-search"
                      type="search"
                      placeholder="Title or reference number"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.filterField}>
                  <label htmlFor="requests-status">Status</label>

                  <select
                    id="requests-status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="all">All statuses</option>

                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterField}>
                  <label htmlFor="requests-category">Category</label>

                  <select
                    id="requests-category"
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    <option value="all">All categories</option>

                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterField}>
                  <label htmlFor="requests-sort">Sort By</label>

                  <select
                    id="requests-sort"
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </div>
              </div>

              <div className={styles.filterSummary}>
                <p role="status">
                  Showing {filteredRequests.length} of {requests.length}{" "}
                  requests
                </p>

                {filtersActive && (
                  <button
                    type="button"
                    className={styles.clearFilters}
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </Card>

            {filteredRequests.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Search}
                  title="No matching requests"
                  description="Try changing your search or filters."
                  action={
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={clearFilters}
                    >
                      Clear Filters
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div className={styles.requestList}>
                {filteredRequests.map((request) => (
                  <Card key={request.service_request_id}>
                    <article className={styles.requestCard}>
                      <div className={styles.requestTop}>
                        <div className={styles.requestIdentity}>
                          <span className={styles.reference}>
                            {request.reference_number}
                          </span>

                          <h2 className={styles.requestTitle}>
                            {request.title}
                          </h2>
                        </div>

                        <StatusBadge status={request.status} />
                      </div>

                      <div className={styles.metadata}>
                        <span>{request.category}</span>
                        <span>Submitted {formatDate(request.created_at)}</span>
                      </div>

                      {request.description && (
                        <p className={styles.description}>
                          {request.description}
                        </p>
                      )}

                      <div className={styles.requestFooter}>
                        <Link
                          to={`/requests/${encodeURIComponent(
                            request.service_request_id,
                          )}`}
                          className={styles.detailsLink}
                        >
                          View Details
                          <span aria-hidden="true"> →</span>
                        </Link>
                      </div>
                    </article>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </section>
  );
}
