import { Link } from "react-router-dom";
import {
  CalendarDays,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useAuth } from "../../auth";
import Card from "../../../shared/ui/Card";
import PageHeader from "../../../shared/ui/PageHeader";
import LoadingState from "../../../shared/ui/LoadingState";
import ErrorBanner from "../../../shared/ui/ErrorBanner";

import styles from "./ProfilePage.module.css";

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

// Shared profile presentation for requester and staff portals.
export default function ProfilePage({ portal = "requester" }) {
  const { user, access, loading, accessError } = useAuth();

  const isStaffPortal = portal === "staff";
  const homePath = isStaffPortal
    ? "/staff/dashboard"
    : "/dashboard";

  if (loading) {
    return <LoadingState message="Loading your profile..." />;
  }

  if (accessError) {
    return (
      <ErrorBanner
        message="Unable to verify your profile information."
      />
    );
  }

  // Select an identity explicitly rather than guessing from the user.
  const profile = isStaffPortal
    ? access?.staff
    : access?.requester;

  if (!user || !profile) {
    return (
      <ErrorBanner
        message="An active account profile could not be found."
      />
    );
  }

  const firstName = profile.first_name?.trim() || "";
  const lastName = profile.last_name?.trim() || "";

  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    "CivicConnect User";

  const roleLabel = isStaffPortal
    ? profile.role
      ? profile.role.charAt(0).toUpperCase() +
        profile.role.slice(1)
      : "Staff"
    : "Requester";

  return (
    <section className={styles.page}>
      <PageHeader
        title="My Profile"
        description="View your CivicConnect account information."
      />

      <div className={styles.content}>
        <Card>
          <div className={styles.profileHeader}>
            <div className={styles.avatar}>
              <UserRound size={32} aria-hidden="true" />
            </div>

            <div className={styles.identity}>
              <h2>{fullName}</h2>
              <p>{user.email || "Email unavailable"}</p>
            </div>

            <span className={styles.roleBadge}>
              <ShieldCheck size={16} aria-hidden="true" />
              {roleLabel}
            </span>
          </div>
        </Card>

        <Card>
          <div className={styles.sectionHeader}>
            <h2>Personal Information</h2>
            <p>
              Your information is linked to your
              CivicConnect account.
            </p>
          </div>

          <dl className={styles.detailsGrid}>
            <div className={styles.detail}>
              <dt>First Name</dt>
              <dd>{firstName || "Not provided"}</dd>
            </div>

            <div className={styles.detail}>
              <dt>Last Name</dt>
              <dd>{lastName || "Not provided"}</dd>
            </div>

            <div className={styles.detail}>
              <dt>
                <Mail size={16} aria-hidden="true" />
                Email Address
              </dt>
              <dd>{user.email || "Not available"}</dd>
            </div>

            <div className={styles.detail}>
              <dt>
                <CalendarDays size={16} aria-hidden="true" />
                Account Created
              </dt>
              <dd>{formatDate(user.created_at)}</dd>
            </div>

            {isStaffPortal && (
              <>
                <div className={styles.detail}>
                  <dt>Staff Role</dt>
                  <dd>{roleLabel}</dd>
                </div>

                <div className={styles.detail}>
                  <dt>Department</dt>
                  <dd>
                    {profile.department || "Not provided"}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </Card>

        <Card>
          <div className={styles.sectionHeader}>
            <h2>Account Settings</h2>
            <p>
              Your profile is currently read-only.
              Changes to account information require
              an authorised update workflow.
            </p>
          </div>

          <div className={styles.actions}>
            <Link to={homePath} className={styles.backLink}>
              Return to Dashboard
            </Link>
          </div>
        </Card>
      </div>
    </section>
  );
}