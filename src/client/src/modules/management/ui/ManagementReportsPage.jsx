import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { useAuth } from "../../auth";
import { createWorkflowModule } from "../../workflows";

import Card from "../../../shared/ui/Card";
import ErrorBanner from "../../../shared/ui/ErrorBanner";
import LoadingState from "../../../shared/ui/LoadingState";
import PageHeader from "../../../shared/ui/PageHeader";

import styles from "./ManagementReportsPage.module.css";

const workflow = createWorkflowModule();

const CATEGORIES = [
  "Water and Sanitation",
  "Roads and Transport",
  "Electricity",
  "Waste Management",
  "Public Safety",
  "Other",
];

// Accessible, data-driven horizontal bar chart.
function ReportBars({ title, items, labelKey }) {
  const maximum = Math.max(
    1,
    ...items.map((item) => item.count)
  );

  return (
    <Card>
      <h2 className={styles.sectionTitle}>{title}</h2>

      <div className={styles.bars}>
        {items.map((item) => (
          <div key={item[labelKey]} className={styles.barRow}>
            <div className={styles.barLabel}>
              <span>{item[labelKey]}</span>
              <strong>{item.count}</strong>
            </div>

            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{
                  width: `${(item.count / maximum) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Shared report page; permissions are enforced by the database.
export default function ManagementReportsPage() {
  const { user, access } = useAuth();

  const [draft, setDraft] = useState({
    startDate: "",
    endDate: "",
    category: "",
  });

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    category: "",
  });

  const [reportState, setReportState] = useState({
    key: null,
    report: null,
    error: "",
  });

  const [validationError, setValidationError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const authorised =
    access?.staffRole === "manager" ||
    access?.staffRole === "admin";

  const userId = user?.id ?? null;

  // Keep report data isolated by user and active filters.
  const queryKey = [
    userId,
    filters.startDate,
    filters.endDate,
    filters.category,
    reloadKey,
  ].join(":");

  useEffect(() => {
    if (!userId || !authorised) return;

    let cancelled = false;

    async function loadReport() {
      try {
        const report = await workflow.team.getReport({
          startDate: filters.startDate || null,
          endDate: filters.endDate || null,
          category: filters.category || null,
        });

        if (!cancelled) {
          setReportState({
            key: queryKey,
            report,
            error: "",
          });
        }
      } catch (error) {
        if (!cancelled) {
          setReportState({
            key: queryKey,
            report: null,
            error:
              error?.message ||
              "Unable to load management reports.",
          });
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [
    userId,
    authorised,
    filters.startDate,
    filters.endDate,
    filters.category,
    queryKey,
  ]);

  const loading = reportState.key !== queryKey;
  const report = loading ? null : reportState.report;
  const error = loading ? "" : reportState.error;

  function applyFilters(event) {
    event.preventDefault();
    setValidationError("");

    const oneDateMissing =
      Boolean(draft.startDate) !== Boolean(draft.endDate);

    if (oneDateMissing) {
      setValidationError(
        "Select both dates, or leave both empty for the last 30 days."
      );
      return;
    }

    if (
      draft.startDate &&
      draft.endDate &&
      draft.startDate > draft.endDate
    ) {
      setValidationError(
        "The start date cannot be after the end date."
      );
      return;
    }

    setFilters({ ...draft });
  }

  function refreshReport() {
    setReloadKey((current) => current + 1);
  }

  if (!authorised) {
    return (
      <ErrorBanner
        message="Manager or administrator access is required."
      />
    );
  }

  return (
    <section className={styles.page}>
      <PageHeader
        title="Service Delivery Reports"
        description="Analyse municipal complaints, completion rates and staff workloads."
      />

      <Card>
        <form className={styles.filters} onSubmit={applyFilters}>
          <label>
            Start Date
            <input
              type="date"
              value={draft.startDate}
              onChange={(event) =>
                setDraft((old) => ({
                  ...old,
                  startDate: event.target.value,
                }))
              }
            />
          </label>

          <label>
            End Date
            <input
              type="date"
              value={draft.endDate}
              onChange={(event) =>
                setDraft((old) => ({
                  ...old,
                  endDate: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Category
            <select
              value={draft.category}
              onChange={(event) =>
                setDraft((old) => ({
                  ...old,
                  category: event.target.value,
                }))
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

          <button type="submit" className={styles.primaryButton}>
            Apply Filters
          </button>
        </form>

        {validationError && (
          <p role="alert" className={styles.error}>
            {validationError}
          </p>
        )}
      </Card>

      {loading ? (
        <Card>
          <LoadingState message="Generating report..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorBanner message={error} />

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={refreshReport}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Try Again
          </button>
        </Card>
      ) : report ? (
        <>
          <div className={styles.reportHeading}>
            <p>
              Reporting period:{" "}
              <strong>
                {report.startDate} to {report.endDate}
              </strong>
            </p>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={refreshReport}
            >
              <RefreshCw size={17} aria-hidden="true" />
              Refresh
            </button>
          </div>

          <div className={styles.statistics}>
            {[
              ["Total Requests", report.summary.totalRequests],
              ["Open Requests", report.summary.openRequests],
              ["Completed", report.summary.completedRequests],
              ["Overdue", report.summary.overdueRequests],
              [
                "Resolution Rate",
                `${report.summary.resolutionRate}%`,
              ],
            ].map(([label, value]) => (
              <Card key={label}>
                <div className={styles.stat}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              </Card>
            ))}
          </div>

          <p className={styles.explanation}>
            Reports include requests created in the selected
            period. Completion means currently Resolved or
            Closed. Resolution rate excludes Rejected requests
            from the denominator.
          </p>

          <div className={styles.breakdowns}>
            <ReportBars
              title="Requests by Category"
              items={report.byCategory}
              labelKey="category"
            />

            <ReportBars
              title="Requests by Status"
              items={report.byStatus}
              labelKey="status"
            />
          </div>

          <Card>
            <h2 className={styles.sectionTitle}>
              Staff Workload
            </h2>

            <p className={styles.explanation}>
              Current open assignments for requests created
              during the selected period.
            </p>

            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Staff Member</th>
                    <th scope="col">Department</th>
                    <th scope="col">Open</th>
                    <th scope="col">Overdue</th>
                  </tr>
                </thead>

                <tbody>
                  {report.staffWorkload.map((member) => (
                    <tr key={member.staffId}>
                      <td>{member.staffName}</td>
                      <td>
                        {member.department || "Not assigned"}
                      </td>
                      <td>{member.openRequests}</td>
                      <td>{member.overdueRequests}</td>
                    </tr>
                  ))}

                  {report.staffWorkload.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        No staff workload records available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </section>
  );
}