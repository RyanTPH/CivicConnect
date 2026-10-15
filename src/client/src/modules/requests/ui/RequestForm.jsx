import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Send, } from "lucide-react";

import Button from "../../../shared/ui/Button";
import Card from "../../../shared/ui/Card";
import ErrorBanner from "../../../shared/ui/ErrorBanner";
import FormField from "../../../shared/ui/FormField";


import { createServiceRequest } from "../service/requestService";
import { saveServiceRequest } from "../repository/supabaseRequestRepository";

import styles from "./RequestForm.module.css";

// Categories supported by the current database schema.
const categories = [
  "Water and Sanitation",
  "Roads and Transport",
  "Electricity",
  "Waste Management",
  "Public Safety",
  "Other",
];

const categoryOptions = categories.map((category) => ({
  label: category,
  value: category,
}));

const initialValues = {
  category: "",
  title: "",
  description: "",
};

// File a Complaint screen, using existing request business logic.
export default function RequestForm() {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [savedRequest, setSavedRequest] = useState(null);

  // Preserve the generated reference when retrying the same submission.
  const pendingRequest = useRef(null);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: "",
    }));

    setSubmissionError("");

    // Edited details represent a new request submission.
    pendingRequest.current = null;
  }

  function validateFields() {
    const nextErrors = {};

    if (!formData.category) {
      nextErrors.category = "Please select a category.";
    } else if (!categories.includes(formData.category)) {
      nextErrors.category = "Please select a valid category.";
    }

    if (!formData.title.trim()) {
      nextErrors.title = "Please enter a complaint title.";
    } else if (formData.title.trim().length > 120) {
      nextErrors.title = "Maximum 120 characters allowed.";
    }

    if (!formData.description.trim()) {
      nextErrors.description = "Please describe the issue.";
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting || savedRequest) return;

    const nextErrors = validateFields();
    setErrors(nextErrors);
    setSubmissionError("");

    if (Object.keys(nextErrors).length > 0) return;

    try {
      // Existing service validates and generates a reference number.
      if (!pendingRequest.current) {
        pendingRequest.current = createServiceRequest(formData);
      }

      setSubmitting(true);

      // Existing repository saves the request to Supabase.
      const saved = await saveServiceRequest(pendingRequest.current);

      if (!saved?.service_request_id) {
        throw new Error("No persisted request was returned.");
      }

      setSavedRequest(saved);
      pendingRequest.current = null;
    } catch (error) {
      const messages = {
        AUTH_REQUIRED: "Please sign in before submitting a complaint.",
        PROFILE_NOT_FOUND:
          "Your requester profile was not found. Contact support.",
        PERMISSION_DENIED:
          "Your account does not have permission to submit complaints.",
        VALIDATION_ERROR: "The complaint contains invalid information.",
        REFERENCE_CONFLICT:
          "The reference number could not be used. Please contact support.",
        DATABASE_ERROR: "Your complaint could not be saved. Please try again.",
        CONFIGURATION_ERROR: "Complaint submission is currently unavailable.",
      };

      setSubmissionError(
        messages[error?.code] ||
          "Unable to submit the complaint. Check your details and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.page}>

      <div className={styles.content}>
        {savedRequest ? (
          <Card>
            <div className={styles.success} role="status">
              <CheckCircle2 size={42} aria-hidden="true" />

              <h2>Complaint Submitted</h2>

              <p>Your complaint has been successfully saved.</p>

              <div className={styles.reference}>
                <span>Reference Number</span>
                <strong>{savedRequest.reference_number}</strong>
              </div>

              <p>Status: {savedRequest.status}</p>

              <div className={styles.actions}>
                <Link
                  to={`/requests/${savedRequest.service_request_id}`}
                  className={styles.primaryLink}
                >
                  View Request Details
                </Link>

                <Link to="/requests" className={styles.cancelLink}>
                  My Requests
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className={styles.sectionHeading}>
              <h2>Complaint Details</h2>
              <p>Fields marked with an asterisk (*) are required.</p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <FormField
                as="select"
                label="Complaint Category"
                name="category"
                placeholder="Select a category"
                options={categoryOptions}
                value={formData.category}
                onChange={handleChange}
                error={errors.category}
                disabled={submitting}
                required
              />

              <FormField
                label="Complaint Title"
                name="title"
                placeholder="e.g. Broken streetlight on Main Street"
                value={formData.title}
                onChange={handleChange}
                error={errors.title}
                maxLength={120}
                helpText="Provide a short description of the issue."
                disabled={submitting}
                required
              />

              <FormField
                as="textarea"
                label="Description"
                name="description"
                placeholder="Describe the problem and where it is happening."
                value={formData.description}
                onChange={handleChange}
                error={errors.description}
                rows={6}
                helpText="Include the street or nearest landmark if relevant."
                disabled={submitting}
                required
              />


              {submissionError && (
                <ErrorBanner
                  message={submissionError}
                  onDismiss={() => setSubmissionError("")}
                />
              )}

              <div className={styles.actions}>
                <Button
  type="submit"
  loading={submitting}
  disabled={submitting}
>
  <Send size={18} aria-hidden="true" />
  {submitting ? "Submitting..." : "Submit Complaint"}
</Button>

                <Link to="/dashboard" className={styles.cancelLink}>
                  Cancel
                </Link>
              </div>
            </form>
          </Card>
        )}
      </div>
    </section>
  );
}
