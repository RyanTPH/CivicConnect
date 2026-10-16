import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, ShieldCheck } from "lucide-react";

import { useAuth } from "../session/useAuth";
import { supabase } from "../../../shared/lib/supabaseClient";

import Button from "../../../shared/ui/Button";
import FormField from "../../../shared/ui/FormField";
import ErrorBanner from "../../../shared/ui/ErrorBanner";
import LoadingState from "../../../shared/ui/LoadingState";

import loginStyles from "./Login.module.css";
import styles from "./SetPassword.module.css";

// Read any error returned when an invitation link is rejected.
// Supabase normally processes the valid invitation session itself.
function getInvitationError() {
  const query = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(
    window.location.hash.slice(1)
  );

  return (
    query.get("error_description") ||
    fragment.get("error_description") ||
    (query.has("error") || fragment.has("error")
      ? "The invitation link is invalid or has expired."
      : "")
  );
}

// Complete staff invitations using the authenticated Supabase session.
export default function SetPassword() {
  const {
    user,
    access,
    loading,
    accessError,
    isSupabaseConfigured,
  } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const invitationError = getInvitationError();

  // The role lookup is backed by the staff table.
  const isStaff = Boolean(access?.isStaff);

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting || completed || !user || !isStaff) return;

    setErrors({});
    setServerError("");

    const validation = {};

    if (password.length < 8) {
      validation.password =
        "Password must contain at least 8 characters.";
    } else if (password.length > 128) {
      validation.password =
        "Password must not exceed 128 characters.";
    }

    if (confirmPassword !== password) {
      validation.confirmPassword =
        "The passwords do not match.";
    }

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setSubmitting(true);

    try {
      // Verify the account with Supabase before changing its password.
      const { data, error: userError } =
        await supabase.auth.getUser();

      if (
        userError ||
        !data?.user ||
        data.user.id !== user.id
      ) {
        throw new Error(
          "Your invitation session is no longer valid. Please request a new invitation."
        );
      }

      // Update only the password for the authenticated user.
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setPassword("");
      setConfirmPassword("");
      setCompleted(true);
    } catch (error) {
      setServerError(
        error?.message ||
          "Unable to save your password. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  let content;

  if (!isSupabaseConfigured) {
    content = (
      <ErrorBanner
        message="CivicConnect authentication is unavailable."
      />
    );
  } else if (loading) {
    content = (
      <LoadingState message="Verifying your account..." />
    );
  } else if (invitationError) {
    content = (
      <>
        <ErrorBanner
          message="This invitation link is invalid or has expired."
        />
        <p className={styles.supportText}>
          Ask your administrator to send another invitation.
        </p>
      </>
    );
  } else if (!user) {
    content = (
      <>
        <ErrorBanner
          message="No valid invitation session was found. Open the invitation link from your email again, or ask your administrator for a new one."
        />
        <p className={styles.supportText}>
          <Link to="/login">Return to Sign In</Link>
        </p>
      </>
    );
  } else if (accessError || !isStaff) {
    content = (
      <>
        <ErrorBanner
          message="Your staff access could not be verified. Please contact your administrator."
        />
        <p className={styles.supportText}>
          Signed in as: {user.email}
        </p>
      </>
    );
  } else if (completed) {
    content = (
      <div className={styles.success} role="status">
        <KeyRound size={32} aria-hidden="true" />

        <h3>Password created successfully</h3>

        <p>
          Your staff password has been saved. You can now
          continue to your CivicConnect portal.
        </p>

        <Link to="/" className={styles.continueLink}>
          Continue to CivicConnect
        </Link>
      </div>
    );
  } else {
    content = (
      <>
        <p className={styles.accountNotice}>
          Setting a password for{" "}
          <strong>{user.email}</strong>
        </p>

        <p className={styles.supportText}>
          Confirm this is your staff email address before
          creating your password.
        </p>

        <ErrorBanner
          message={serverError}
          onDismiss={() => setServerError("")}
        />

        <form
          className={styles.form}
          onSubmit={handleSubmit}
          noValidate
        >
          <FormField
            label="New Password"
            name="new-password"
            type="password"
            autoComplete="new-password"
            placeholder="Create your password"
            helpText="Use at least 8 characters."
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors((old) => ({
                ...old,
                password: "",
              }));
              setServerError("");
            }}
            error={errors.password}
            disabled={submitting}
            required
          />

          <FormField
            label="Confirm Password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setErrors((old) => ({
                ...old,
                confirmPassword: "",
              }));
              setServerError("");
            }}
            error={errors.confirmPassword}
            disabled={submitting}
            required
          />

          <Button
            type="submit"
            fullWidth
            loading={submitting}
            disabled={submitting}
          >
            {submitting
              ? "Saving Password..."
              : "Set Password"}
          </Button>
        </form>
      </>
    );
  }

  return (
    <main className={loginStyles.loginPage}>
      <div className={loginStyles.loginContainer}>
        <header className={loginStyles.brandHeader}>
          <div className={loginStyles.brandIcon}>
            <ShieldCheck size={32} aria-hidden="true" />
          </div>

          <h1 className={loginStyles.brandTitle}>
            CivicConnect
          </h1>

          <p className={loginStyles.brandSubtitle}>
            STAFF ACCOUNT SETUP
          </p>

          <p className={loginStyles.brandDescription}>
            Secure access to municipal service management.
          </p>
        </header>

        <section
          className={loginStyles.loginPanel}
          aria-labelledby="set-password-title"
        >
          <div className={loginStyles.panelHeading}>
            <h2 id="set-password-title">
              Set Your Password
            </h2>

            <p>
              Complete your staff invitation by creating
              a secure password.
            </p>
          </div>

          {content}
        </section>
      </div>

      <p className={loginStyles.footerText}>
        CivicConnect — Municipal Service Request Portal
      </p>
    </main>
  );
}