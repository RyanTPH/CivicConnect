import { useId } from "react";
import styles from "./UI.module.css";

// Accessible form field with inline help and validation feedback.
export default function FormField({
  label,
  name,
  id,
  type = "text",
  as = "input",
  options = [],
  placeholder,
  helpText,
  error,
  required = false,
  className = "",
  ...props
}) {
  const generatedId = useId();
  const fieldId = id || name || generatedId;
  const helpId = `${fieldId}-help`;
  const errorId = `${fieldId}-error`;

  const describedBy = [
    helpText ? helpId : null,
    error ? errorId : null,
    props["aria-describedby"],
  ].filter(Boolean).join(" ") || undefined;

  const commonProps = {
    id: fieldId,
    name,
    required,
    "aria-invalid": Boolean(error),
    "aria-describedby": describedBy,
    className: [
      styles.formControl,
      error ? styles.formControlError : "",
    ].filter(Boolean).join(" "),
    ...props,
  };

  return (
    <div className={`${styles.formField} ${className}`}>
      <label htmlFor={fieldId} className={styles.formLabel}>
        {label}
        {required && (
          <span className={styles.required}> *</span>
        )}
      </label>

      {as === "textarea" ? (
        <textarea
          {...commonProps}
          placeholder={placeholder}
          rows={props.rows || 4}
        />
      ) : as === "select" ? (
        <select {...commonProps} defaultValue={props.defaultValue ?? ""}>
          <option value="" disabled>
            {placeholder || "Select an option"}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...commonProps}
          type={type}
          placeholder={placeholder}
        />
      )}

      {helpText && (
        <p id={helpId} className={styles.helpText}>
          {helpText}
        </p>
      )}

      {error && (
        <p id={errorId} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}