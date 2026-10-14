import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

import { useAuth } from "../session/useAuth";
import Button from "../../../shared/ui/Button";
import FormField from "../../../shared/ui/FormField";
import ErrorBanner from "../../../shared/ui/ErrorBanner";
import LoadingState from "../../../shared/ui/LoadingState";

import styles from "./Login.module.css";

// Public authentication page for CivicConnect.
export default function Login() {
  const {
    user,
    loading,
    signIn,
    isSupabaseConfigured,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Restore the originally requested route after signing in.
  const from = location.state?.from;

  const destination =
    from?.pathname?.startsWith("/") &&
    !from.pathname.startsWith("//") &&
    from.pathname !== "/login"
      ? `${from.pathname}${from.search || ""}${from.hash || ""}`
      : "/dashboard";

  if (!isSupabaseConfigured) {
    return (
      <main className={styles.messagePage}>
        <h1>CivicConnect</h1>
        <ErrorBanner
          message="Supabase is not configured. Check your frontend .env file and restart the development server."
        />
      </main>
    );
  }

  if (loading) {
    return <LoadingState message="Checking your session..." />;
  }

  if (user) {
    return <Navigate to={destination} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) return;

    setError("");
    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
      navigate(destination, { replace: true });
    } catch {
      // Avoid exposing technical authentication details.
      setError(
        "Unable to sign in. Check your email and password and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginContainer}>
        <header className={styles.brandHeader}>
          <div className={styles.brandIcon}>
            <ShieldCheck size={32} aria-hidden="true" />
          </div>

          <h1 className={styles.brandTitle}>
            CivicConnect
          </h1>

          <p className={styles.brandSubtitle}>
            CITIZEN SERVICE PORTAL
          </p>

          <p className={styles.brandDescription}>
            Connecting communities with municipal services.
          </p>
        </header>

        <section
          className={styles.loginPanel}
          aria-labelledby="login-title"
        >
          <div className={styles.panelHeading}>
            <h2 id="login-title">Welcome Back</h2>
            <p>
              Sign in to manage and track your service requests.
            </p>
          </div>

          <ErrorBanner
            message={error}
            onDismiss={() => setError("")}
          />

          <form
            className={styles.loginForm}
            onSubmit={handleSubmit}
          >
            <FormField
              label="Email Address"
              name="login-email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={submitting}
            />

            <div className={styles.passwordField}>
              <FormField
                label="Password"
                name="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={submitting}
              />

              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff size={19} aria-hidden="true" />
                ) : (
                  <Eye size={19} aria-hidden="true" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              fullWidth
              loading={submitting}
            >
              {submitting ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <p className={styles.supportText}>
            Need help accessing your account? Contact your
            municipality's support team.
          </p>
        </section>
      </div>

      <p className={styles.footerText}>
        CivicConnect — Municipal Service Request Portal
      </p>
    </main>
  );
}