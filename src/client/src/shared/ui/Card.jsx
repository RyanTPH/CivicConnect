import styles from "./UI.module.css";

// Shared surface container for related information.
export default function Card({
  children,
  title,
  className = "",
  ...props
}) {
  return (
    <section
      className={`${styles.card} ${className}`}
      {...props}
    >
      {title && (
        <h2 className={styles.cardTitle}>{title}</h2>
      )}
      {children}
    </section>
  );
}