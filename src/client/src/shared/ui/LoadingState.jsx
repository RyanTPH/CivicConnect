import { LoaderCircle } from "lucide-react";
import styles from "./UI.module.css";

// Loading feedback for asynchronous page operations.
export default function LoadingState({
  message = "Loading, please wait...",
}) {
  return (
    <div
      className={styles.loadingState}
      role="status"
      aria-live="polite"
    >
      <LoaderCircle
        size={30}
        className={styles.spinner}
        aria-hidden="true"
      />
      <p>{message}</p>
    </div>
  );
}