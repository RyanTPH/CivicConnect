import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  LockKeyhole,
  RefreshCw,
  Search,
} from "lucide-react";

import { useAuth } from "../../auth";
import { getStaffRequests } from "../../requests";

import Card from "../../../shared/ui/Card";
import ErrorBanner from "../../../shared/ui/ErrorBanner";
import LoadingState from "../../../shared/ui/LoadingState";
import PageHeader from "../../../shared/ui/PageHeader";
import StatusBadge from "../../../shared/ui/StatusBadge";

import styles from "./ManagementDashboardPage.module.css";

const OPEN_STATUSES = new Set(["Submitted", "Accepted", "In Progress"]);

const CATEGORIES = [
  "Water and Sanitation",
  "Roads and Transport",
  "Electricity",
  "Waste Management",
  "Public Safety",
  "Other",
];

const STATUSES = [
  "Submitted",
  "Accepted",
  "In Progress",
  "Resolved",
  "Closed",
  "Rejected",
];

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

function isOverdue(request, now) {
  if (!OPEN_STATUSES.has(request.status) || !request.due_at) {
    return false;
  }

  const dueDate = Date.parse(request.due_at);

  return Number.isFinite(dueDate) && dueDate < now;
}

// Shared read-only overview for manager and admin portals.
export default function ManagementDashboardPage({ portal = "manager" }) {
  const { access } = useAuth();

  const [result, setResult] = useState({
    loading: true,
    requests: [],
    error: "",
  });
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [monitorFilter, setMonitorFilter] = useState("all");

  const role = access?.staffRole;
  const authorised = role === "manager" || role === "admin";

  const firstName =
    access?.staff?.first_name?.trim() ||
    (portal === "admin" ? "Administrator" : "Manager");

  // Load only records authorised by the current Supabase session.
  useEffect(() => {
    if (!authorised) return;

    let cancelled = false;

    async function loadRequests() {
      try {
        const requests = await getStaffRequests();

        if (!cancelled) {
          setResult({
            loading: false,
            requests,
            error: "",
          });
        }
      } catch {
        if (!cancelled) {
          setResult({
            loading: false,
            requests: [],
            error: "Unable to load the management overview.",
          });
        }
      }
    }

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, [authorised, role, reloadKey]);

  // Refresh this timestamp when the dashboard data is refreshed.
  const [asOf, setAsOf] = useState(() => Date.now());
  const now = asOf;

  const summary = useMemo(() => {
    const requests = result.requests;

    return {
      total: requests.length,
      open: requests.filter((request) => OPEN_STATUSES.has(request.status))
        .length,
      overdue: requests.filter((request) => isOverdue(request, now)).length,
      resolved: requests.filter((request) => request.status === "Resolved")
        .length,
      closed: requests.filter((request) => request.status === "Closed").length,
    };
  }, [result.requests, now]);

  const visibleRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return result.requests.filter((request) => {
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

      const matchesMonitor =
        monitorFilter === "all" ||
        (monitorFilter === "open" && OPEN_STATUSES.has(request.status)) ||
        (monitorFilter === "overdue" && isOverdue(request, now)) ||
        (monitorFilter === "resolved" && request.status === "Resolved") ||
        (monitorFilter === "closed" && request.status === "Closed");

      return (
        matchesSearch && matchesStatus && matchesCategory && matchesMonitor
      );
    });
  }, [
    result.requests,
    search,
    statusFilter,
    categoryFilter,
    monitorFilter,
    now,
  ]);

  function refresh() {

    setAsOf(Date.now());

    setResult((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    setReloadKey((value) => value + 1);
  }

  const overviewCards = [
    {
      label: "Open Requests",
      value: summary.open,
      icon: ClipboardList,
      filter: "open",
    },
    {
      label: "Overdue Requests",
      value: summary.overdue,
      icon: AlertTriangle,
      filter: "overdue",
    },
    {
      label: "Resolved Requests",
      value: summary.resolved,
      icon: CheckCircle2,
      filter: "resolved",
    },
    {
      label: "Closed Requests",
      value: summary.closed,
      icon: LockKeyhole,
      filter: "closed",
    },
  ];

  if (!authorised) {
    return (
      <ErrorBanner message="A manager or administrator account is required." />
    );
  }

  return (
    <section className={styles.page}>
      <PageHeader
        title={`Welcome Back, ${firstName}!`}
        description={
          portal === "admin"
            ? "Review authorised CivicConnect service activity."
            : "Monitor municipal requests and service performance."
        }
      />

      {result.loading ? (
        <Card>
          <LoadingState message="Loading management overview..." />
        </Card>
      ) : result.error ? (
        <Card>
          <ErrorBanner message={result.error} />

          <button
            type="button"
            className={styles.refreshButton}
            onClick={refresh}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Try Again
          </button>
        </Card>
      ) : (
        <>
          <p className={styles.context}>
            Showing statistics for {summary.total} accessible requests returned
            by the service.
          </p>

          <div className={styles.summaryGrid}>
            {overviewCards.map((item) => {
              const Icon = item.icon;

              return (
                <Card key={item.label}>
                  <button
                    type="button"
                    className={styles.summaryCard}
                    onClick={() => {
                      setMonitorFilter(item.filter);
                      document
                        .getElementById("management-requests")
                        ?.scrollIntoView({
                          behavior: "smooth",
                        });
                    }}
                  >
                    <Icon size={24} aria-hidden="true" />
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </button>
                </Card>
              );
            })}
          </div>

          <section id="management-requests" className={styles.requestSection}>
            <div className={styles.sectionHeading}>
              <h2>Request Monitoring</h2>

              <button
                type="button"
                className={styles.refreshButton}
                onClick={refresh}
              >
                <RefreshCw size={17} aria-hidden="true" />
                Refresh
              </button>
            </div>

            <Card>
              <div className={styles.filters}>
                <div className={styles.field}>
                  <label htmlFor="manager-search">Search Requests</label>

                  <div className={styles.searchControl}>
                    <Search size={18} aria-hidden="true" />

                    <input
                      id="manager-search"
                      type="search"
                      placeholder="Title or reference"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="manager-status">Status</label>

                  <select
                    id="manager-status"
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

                <div className={styles.field}>
                  <label htmlFor="manager-category">Category</label>

                  <select
                    id="manager-category"
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

                <div className={styles.field}>
                  <label htmlFor="manager-monitor">Monitoring View</label>

                  <select
                    id="manager-monitor"
                    value={monitorFilter}
                    onChange={(event) => setMonitorFilter(event.target.value)}
                  >
                    <option value="all">All requests</option>
                    <option value="open">Open</option>
                    <option value="overdue">Overdue</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <p className={styles.resultCount} role="status">
                Showing {visibleRequests.length} of {result.requests.length}{" "}
                accessible requests
              </p>
            </Card>

            {visibleRequests.length === 0 ? (
              <Card>
                <p className={styles.emptyMessage}>
                  No requests match the selected filters.
                </p>
              </Card>
            ) : (
              <div className={styles.requestList}>
                {visibleRequests.map((request) => (
                  <Card key={request.service_request_id}>
                    <article className={styles.requestCard}>
                      <div className={styles.requestInfo}>
                        <span className={styles.reference}>
                          {request.reference_number}
                        </span>

                        <h3>{request.title}</h3>

                        <p>
                          {request.category} · {formatDate(request.created_at)}
                        </p>

                        <p>Priority: {request.priority ?? "Not set"}</p>

                        <p>Due: {formatDate(request.due_at)}</p>
                      </div>

                      <div className={styles.requestStatus}>
                        <StatusBadge status={request.status} />
                        <span>
                          {request.assigned_staff_id
                            ? "Assigned"
                            : "Unassigned"}
                        </span>
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
