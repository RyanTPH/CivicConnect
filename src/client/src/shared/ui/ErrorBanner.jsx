import { AlertCircle, X } from "lucide-react";
import styles from "./UI.module.css";

// Displays safe, user-facing error messages.
export default function ErrorBanner({
  message,
  onDismiss,
}) {
  if (!message) return null;

  return (
    <div className={styles.errorBanner} role="alert">
      <AlertCircle size={20} aria-hidden="true" />

      <p className={styles.errorMessage}>{message}</p>

      {onDismiss && (
        <button
          type="button"
          className={styles.dismissButton}
          onClick={onDismiss}
          aria-label="Dismiss error"
        >
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}