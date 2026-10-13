import { useState } from "react";
import { LogOut } from "lucide-react";

import { useAuth } from "../session/useAuth";
import styles from "./LogoutButton.module.css";

// Reusable sign-out control for desktop and mobile navigation.
export default function LogoutButton({ onSignedOut }) {
  const { signOut } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSignOut() {
    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      await signOut();
      onSignedOut?.();
    } catch {
      setError("Unable to sign out. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.logoutButton}
        onClick={handleSignOut}
        disabled={submitting}
        aria-busy={submitting}
      >
        <LogOut size={20} aria-hidden="true" />
        <span>
          {submitting ? "Signing Out..." : "Logout"}
        </span>
      </button>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}