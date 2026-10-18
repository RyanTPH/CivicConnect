import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, UsersRound } from "lucide-react";

import { useAuth } from "../../auth";
import { createWorkflowModule } from "../../workflows";

import Card from "../../../shared/ui/Card";
import ErrorBanner from "../../../shared/ui/ErrorBanner";
import LoadingState from "../../../shared/ui/LoadingState";
import PageHeader from "../../../shared/ui/PageHeader";

import styles from "./TeamOverviewPage.module.css";

// Reuse the services supplied by the backend integration team.
const workflow = createWorkflowModule();

const ROLE_OPTIONS = ["staff", "manager", "admin"];

const EMPTY_TEAM = [];

export default function TeamOverviewPage() {
  const { user, access } = useAuth();

  // Keep managers and admins within their own portal.
  const portal = access?.staffRole === "admin" ? "admin" : "manager";

  const [teamState, setTeamState] = useState({
    userId: null,
    records: [],
    error: "",
  });

  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const userId = user?.id;
  const isManagement =
    access?.staffRole === "manager" || access?.staffRole === "admin";

  // Request the directory once per authenticated user or refresh.
  useEffect(() => {
    if (!userId || !isManagement) return;

    let cancelled = false;

    workflow.team
      .getOverview()
      .then((records) => {
        if (!cancelled) {
          setTeamState({
            userId,
            records: records ?? [],
            error: "",
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTeamState({
            userId,
            records: [],
            error: "Unable to load the team directory. Please try again.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, isManagement, reloadKey]);

  // Never display a previous account's team records.
  const loading = teamState.userId !== userId;
  const team = loading ? EMPTY_TEAM : teamState.records;
  const error = loading ? "" : teamState.error;

  const summary = useMemo(
    () => ({
      total: team.length,
      active: team.filter((member) => member.isActive).length,
      inactive: team.filter((member) => !member.isActive).length,
    }),
    [team],
  );

  const filteredTeam = useMemo(() => {
    const query = search.trim().toLowerCase();

    return team.filter((member) => {
      const name = `${member.firstName ?? ""} ${member.lastName ?? ""}`
        .trim()
        .toLowerCase();

      const department = String(member.department ?? "").toLowerCase();

      return (
        (!query || name.includes(query) || department.includes(query)) &&
        (roleFilter === "all" || member.role === roleFilter) &&
        (activeFilter === "all" || String(member.isActive) === activeFilter)
      );
    });
  }, [team, search, roleFilter, activeFilter]);

  function refreshTeam() {
    setTeamState({
      userId: null,
      records: [],
      error: "",
    });

    setReloadKey((current) => current + 1);
  }

  if (!isManagement) {
    return <ErrorBanner message="Management access is required." />;
  }

  return (
    <section className={styles.page}>
      <PageHeader
        title="Team Overview"
        description="Review team members, availability and request workload."
      />

      {loading ? (
        <Card>
          <LoadingState message="Loading team directory..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorBanner message={error} />

          <button
            type="button"
            className={styles.actionButton}
            onClick={refreshTeam}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Try Again
          </button>
        </Card>
      ) : (
        <>
          <div className={styles.summaryGrid}>
            {[
              ["Total Staff", summary.total],
              ["Active Staff", summary.active],
              ["Inactive Staff", summary.inactive],
            ].map(([label, value]) => (
              <Card key={label}>
                <div className={styles.summaryCard}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <div className={styles.sectionHeading}>
              <h2>Staff Directory</h2>

              <button
                type="button"
                className={styles.actionButton}
                onClick={refreshTeam}
              >
                <RefreshCw size={17} aria-hidden="true" />
                Refresh
              </button>
            </div>

            <div className={styles.filters}>
              <label>
                Search
                <input
                  type="search"
                  placeholder="Name or department"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>

              <label>
                Role
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                >
                  <option value="all">All roles</option>

                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Account Status
                <select
                  value={activeFilter}
                  onChange={(event) => setActiveFilter(event.target.value)}
                >
                  <option value="all">All staff</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
            </div>

            <p className={styles.count} role="status">
              Showing {filteredTeam.length} of {team.length} staff members
            </p>
          </Card>

          {filteredTeam.length === 0 ? (
            <Card>
              <div className={styles.empty}>
                <UsersRound size={34} aria-hidden="true" />
                <p>No staff members match your filters.</p>
              </div>
            </Card>
          ) : (
            <div className={styles.teamList}>
              {filteredTeam.map((member) => (
                <Card key={member.staffId}>
                  <article className={styles.member}>
                    <div className={styles.memberInfo}>
                      <h3>
                        {[member.firstName, member.lastName]
                          .filter(Boolean)
                          .join(" ") || "Unnamed Staff Member"}
                      </h3>

                      <Link
                        to={`/${portal}/team/${member.staffId}`}
                        className={styles.detailsLink}
                        aria-label={`View details for ${
                          [member.firstName, member.lastName]
                            .filter(Boolean)
                            .join(" ") || "staff member"
                        }`}
                      >
                        View workload and history
                      </Link>

                      <p>{member.department || "Department not assigned"}</p>

                      <span className={styles.role}>{member.role}</span>
                    </div>

                    <div className={styles.workload}>
                      <span>{member.isActive ? "Active" : "Inactive"}</span>

                      <strong>{member.openTasks ?? 0} open</strong>

                      <span>{member.overdueTasks ?? 0} overdue</span>
                    </div>
                  </article>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
