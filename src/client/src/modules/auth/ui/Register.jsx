import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

import { useAuth } from "../session/useAuth";
import { validateRegistration } from "../service/registrationValidation";

import Button from "../../../shared/ui/Button";
import FormField from "../../../shared/ui/FormField";
import LoadingState from "../../../shared/ui/LoadingState";

import loginStyles from "./Login.module.css";
import styles from "./Register.module.css";
import ErrorBanner from "../../../shared/ui/ErrorBanner";

const initialValues = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

// Registration UI preview until requester provisioning is available.
export default function Register() {
  const { user, loading, signUp, isSupabaseConfigured } = useAuth();

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [registered, setRegistered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Clear errors when the requester edits a field.
  function updateField(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: "",
    }));

    setServerError("");
    setRegistered(false);
  }

  // Validate and submit the requester account to Supabase Auth.
  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting || registered) return;

    setServerError("");

    const validationErrors = validateRegistration(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const data = await signUp({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
      });

      if (!data?.user) {
        throw new Error("Registration did not return a user.");
      }

      // Clear passwords after the registration response.
      setValues((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
      }));

      // With email confirmation enabled, no session is issued yet.
      // Without confirmation, AuthProvider handles the new session.
      setRegistered(true);
    } catch (error) {
      // Never expose database or trigger internals to the requester.
      const rateLimited =
        error?.status === 429 || error?.code === "over_email_send_rate_limit";

      setServerError(
        rateLimited
          ? "Too many registration attempts. Please wait before trying again."
          : "Unable to complete registration. Check your details and try again. If the problem continues, contact support.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <ErrorBanner message="Registration is temporarily unavailable. Supabase is not configured." />
    );
  }

  if (loading) {
    return <LoadingState message="Checking your session..." />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className={loginStyles.loginPage}>
      <div className={loginStyles.loginContainer}>
        <header className={loginStyles.brandHeader}>
          <div className={loginStyles.brandIcon}>
            <ShieldCheck size={32} aria-hidden="true" />
          </div>

          <h1 className={loginStyles.brandTitle}>CivicConnect</h1>

          <p className={loginStyles.brandSubtitle}>CITIZEN SERVICE PORTAL</p>

          <p className={loginStyles.brandDescription}>
            Connecting communities with municipal services.
          </p>
        </header>

        <section
          className={loginStyles.loginPanel}
          aria-labelledby="register-title"
        >
          <div className={loginStyles.panelHeading}>
            <h2 id="register-title">Create an Account</h2>

            <p>
              Enter your details to create your CivicConnect requester account.
            </p>
          </div>

          <ErrorBanner
            message={serverError}
            onDismiss={() => setServerError("")}
          />

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <FormField
              label="First Name"
              name="first-name"
              autoComplete="given-name"
              placeholder="Enter your first name"
              value={values.firstName}
              error={errors.firstName}
              disabled={submitting || registered}
              onChange={(event) => updateField("firstName", event.target.value)}
              required
            />

            <FormField
              label="Last Name"
              name="last-name"
              autoComplete="family-name"
              placeholder="Enter your last name"
              value={values.lastName}
              error={errors.lastName}
              disabled={submitting || registered}
              onChange={(event) => updateField("lastName", event.target.value)}
              required
            />

            <FormField
              label="Email Address"
              name="register-email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email address"
              value={values.email}
              error={errors.email}
              disabled={submitting || registered}
              onChange={(event) => updateField("email", event.target.value)}
              required
            />

            <div className={styles.passwordField}>
              <label htmlFor="register-password" className={styles.fieldLabel}>
                Password <span aria-hidden="true">*</span>
              </label>

              <div className={styles.passwordControl}>
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className={styles.passwordInput}
                  autoComplete="new-password"
                  placeholder="Create a password"
                  value={values.password}
                  disabled={submitting || registered}
                  onChange={(event) =>
                    updateField("password", event.target.value)
                  }
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password
                      ? "register-password-error"
                      : "register-password-help"
                  }
                  required
                />

                <button
                  type="button"
                  className={styles.visibilityButton}
                  disabled={submitting || registered}
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff size={19} aria-hidden="true" />
                  ) : (
                    <Eye size={19} aria-hidden="true" />
                  )}
                </button>
              </div>

              {errors.password ? (
                <p id="register-password-error" className={styles.fieldError}>
                  {errors.password}
                </p>
              ) : (
                <p id="register-password-help" className={styles.fieldHelp}>
                  Use at least 8 characters.
                </p>
              )}
            </div>

            <div className={styles.passwordField}>
              <label
                htmlFor="register-confirm-password"
                className={styles.fieldLabel}
              >
                Confirm Password <span aria-hidden="true">*</span>
              </label>

              <div className={styles.passwordControl}>
                <input
                  id="register-confirm-password"
                  name="confirm-password"
                  type={showConfirmation ? "text" : "password"}
                  className={styles.passwordInput}
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  value={values.confirmPassword}
                  disabled={submitting || registered}
                  onChange={(event) =>
                    updateField("confirmPassword", event.target.value)
                  }
                  aria-invalid={Boolean(errors.confirmPassword)}
                  aria-describedby={
                    errors.confirmPassword
                      ? "register-confirm-error"
                      : undefined
                  }
                  required
                />

                <button
                  type="button"
                  className={styles.visibilityButton}
                  disabled={submitting || registered}
                  onClick={() => setShowConfirmation((visible) => !visible)}
                  aria-label={
                    showConfirmation
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                  aria-pressed={showConfirmation}
                >
                  {showConfirmation ? (
                    <EyeOff size={19} aria-hidden="true" />
                  ) : (
                    <Eye size={19} aria-hidden="true" />
                  )}
                </button>
              </div>

              {errors.confirmPassword && (
                <p id="register-confirm-error" className={styles.fieldError}>
                  {errors.confirmPassword}
                </p>
              )}
            </div>
            {registered && (
              <div className={styles.successNotice} role="status">
                <strong>Registration submitted successfully!</strong>

                <p>
                  Please check your email for a verification link. Once you've
                  confirmed your email address, your CivicConnect requester
                  account will be activated.
                </p>

                <p>
                  After confirming your email, you can sign in and start
                  submitting service requests.
                </p>
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              loading={submitting}
              disabled={submitting || registered}
            >
              {submitting ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <p className={styles.signInText}>
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </section>
      </div>

      <p className={loginStyles.footerText}>
        CivicConnect — Municipal Service Request Portal
      </p>
    </main>
  );
}
