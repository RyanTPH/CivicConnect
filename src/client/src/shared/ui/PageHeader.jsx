import styles from "./UI.module.css";

// Main page heading with optional description and action.
export default function PageHeader({
  title,
  description,
  action,
}) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>

        {description && (
          <p className={styles.pageDescription}>
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className={styles.pageAction}>
          {action}
        </div>
      )}
    </div>
  );
}