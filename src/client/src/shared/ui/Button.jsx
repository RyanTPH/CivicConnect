import { LoaderCircle } from "lucide-react";
import styles from "./UI.module.css";

// Shared action button with consistent styling and loading feedback.
export default function Button({
  children,
  variant = "primary",
  type = "button",
  loading = false,
  disabled = false,
  fullWidth = false,
  className = "",
  ...props
}) {
  const variants = {
    primary: styles.buttonPrimary,
    secondary: styles.buttonSecondary,
    danger: styles.buttonDanger,
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      className={[
        styles.button,
        variants[variant] || variants.primary,
        fullWidth ? styles.fullWidth : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {loading && (
        <LoaderCircle
          size={18}
          className={styles.spinner}
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}