import { useState } from "react";
import { createRequestComment } from "../repository/supabaseCommentRepository";

import styles from "./RequestCommentForm.module.css";

const MAX_LENGTH = 2000;

export default function RequestCommentForm({
  requestId,
  allowInternal = false,
  disabled = false,
  onCommentAdded,
}) {
  const [text, setText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving || disabled) return;

    const comment = text.trim();

    if (!comment) {
      setError("Please enter a comment.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await createRequestComment({
        requestId,
        text: comment,
        // Requesters can never select an internal note.
        isInternal: allowInternal && isInternal,
      });

      setText("");
      setIsInternal(false);
      setSuccess("Comment posted successfully.");

      // Refresh the existing comments list after the write.
      onCommentAdded?.();
    } catch (caughtError) {
      setError(
        caughtError?.message ||
          "Unable to post your comment."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
    >
      <label htmlFor={`comment-${requestId}`}>
        {allowInternal ? "Add a Comment or Note" : "Add a Comment"}
      </label>

      <textarea
        id={`comment-${requestId}`}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setError("");
          setSuccess("");
        }}
        placeholder={
          allowInternal
            ? "Enter a progress update or message..."
            : "Write your message to the municipality..."
        }
        rows={4}
        maxLength={MAX_LENGTH}
        disabled={saving || disabled}
        required
      />

      {allowInternal && (
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={isInternal}
            disabled={saving || disabled}
            onChange={(event) =>
              setIsInternal(event.target.checked)
            }
          />

          Internal staff note
        </label>
      )}

      {allowInternal && (
        <p className={styles.hint}>
          Public comments can be viewed by the requester.
          Internal notes are for authorised staff only.
        </p>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {success && (
        <p className={styles.success} role="status">
          {success}
        </p>
      )}

      <button
        type="submit"
        className={styles.submitButton}
        disabled={saving || disabled || !text.trim()}
      >
        {saving ? "Posting..." : "Post Comment"}
      </button>
    </form>
  );
}