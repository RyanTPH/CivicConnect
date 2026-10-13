import { Inbox } from "lucide-react";
import styles from "./UI.module.css";

// Reusable empty-result state with an optional next action.
export default function EmptyState({
  title = "Nothing here yet",
  description = "There are no items to display.",
  action,
  icon: Icon = Inbox,
}) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <Icon size={30} aria-hidden="true" />
      </div>

      <h2 className={styles.emptyTitle}>{title}</h2>
      <p className={styles.emptyDescription}>
        {description}
      </p>

      {action && (
        <div className={styles.emptyAction}>{action}</div>
      )}
    </div>
  );
}