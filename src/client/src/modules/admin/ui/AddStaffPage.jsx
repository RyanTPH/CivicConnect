import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";

import {
  useAuth,
  addStaffMember,
  resendStaffSetup,
  STAFF_ROLES,
} from "../../auth";

import Button from "../../../shared/ui/Button";
import Card from "../../../shared/ui/Card";
import ErrorBanner from "../../../shared/ui/ErrorBanner";
import FormField from "../../../shared/ui/FormField";
import PageHeader from "../../../shared/ui/PageHeader";

import styles from "./AddStaffPage.module.css";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  role: "",
  department: "",
};

// Mirror the Edge Function's documented validation rules.
function validateStaff(values) {
  const errors = {};

  if (
    !values.firstName.trim() ||
    values.firstName.trim().length > 100
  ) {
    errors.firstName =
      "Enter a first name (maximum 100 characters).";
  }

  if (
    !values.lastName.trim() ||
    values.lastName.trim().length > 100
  ) {
    errors.lastName =
      "Enter a last name (maximum 100 characters).";
  }

  const email = values.email.trim();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254
  ) {
    errors.email = "Enter a valid email address.";
  }

  if (!STAFF_ROLES.some((role) => role.value === values.role)) {
    errors.role = "Select a valid staff role.";
  }

  if (values.department.trim().length > 100) {
    errors.department =
      "Department must be 100 characters or fewer.";
  }

  return errors;
}

export default function AddStaffPage() {
  const { access } = useAuth();

  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const isAdmin =
    access?.isStaff && access?.staffRole === "admin";

  const selectedRole = STAFF_ROLES.find(
    (role) => role.value === values.role
  );

  function updateField(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: "",
    }));

    setServerError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting || !isAdmin) return;

    setServerError("");
    setSuccess(null);

    const validation = validateStaff(values);
    setErrors(validation);

    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);

    try {
      const input = {
        email: values.email.trim().toLowerCase(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        role: values.role,
        department: values.department.trim(),
      };

      // All privileged account operations happen on the server.
      const result = await addStaffMember(input);

      if (!result?.staff_id) {
        throw new Error(
          "The server did not confirm staff creation."
        );
      }

      setSuccess({
        name: `${input.firstName} ${input.lastName}`,
        email: input.email,
        role: input.role,
        inviteSent: Boolean(result.invite_sent),
        rehired: Boolean(result.rehired),
        staffId: result.staff_id,
        message: result.message,
      });

      setValues({ ...EMPTY_FORM });
      setErrors({});
    } catch (error) {
      // The Edge Function returns field-specific errors for 422.
      if (error?.fields && typeof error.fields === "object") {
        setErrors(error.fields);
      }

      setServerError(
        error?.message ||
          "Unable to add the staff member. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAdmin) {
    return (
      <ErrorBanner
        message="Administrator access is required to add staff."
      />
    );
  }

  return (
    <section className={styles.page}>
      <Link to="/admin/team" className={styles.backLink}>
        <ArrowLeft size={18} aria-hidden="true" />
        Back to Team Overview
      </Link>

      <PageHeader
        title="Add Staff Member"
        description="Create or link a municipal staff account and assign its role."
      />

      {success && (
        <Card>
          <div className={styles.success} role="status">
            <div className={styles.successHeading}>
              <UserPlus size={22} aria-hidden="true" />
              <h2>
                {success.rehired
                  ? "Staff account restored"
                  : "Staff member added"}
              </h2>
            </div>

            <p>
              <strong>{success.name}</strong>
              {" — "}
              {success.email}
            </p>

            <p className={styles.roleText}>
              Role: {success.role}
            </p>

            <p>
              {success.inviteSent
                ? "An invitation email was sent. The staff member must follow the link to complete account setup."
                : "The staff record was saved. No new invitation was confirmed; this person may already have a login."}
            </p>

            <p className={styles.smallText}>
              Staff ID: {success.staffId}
            </p>

            <div className={styles.successActions}>
              <Button
                variant="secondary"
                onClick={() => setSuccess(null)}
              >
                Add Another Staff Member
              </Button>

              <Link
                to="/admin/team"
                className={styles.directoryLink}
              >
                View Staff Directory
              </Link>
            </div>
          </div>
        </Card>
      )}

      {!success && (
        <Card>
          <form
            className={styles.form}
            onSubmit={handleSubmit}
            noValidate
          >
            <div className={styles.sectionHeading}>
              <h2>Personal Details</h2>
              <p>
                Enter the staff member's official contact details.
              </p>
            </div>

            <div className={styles.twoColumns}>
              <FormField
                label="First Name"
                name="firstName"
                value={values.firstName}
                onChange={(event) =>
                  updateField("firstName", event.target.value)
                }
                error={errors.firstName}
                autoComplete="given-name"
                maxLength={100}
                disabled={submitting}
                required
              />

              <FormField
                label="Last Name"
                name="lastName"
                value={values.lastName}
                onChange={(event) =>
                  updateField("lastName", event.target.value)
                }
                error={errors.lastName}
                autoComplete="family-name"
                maxLength={100}
                disabled={submitting}
                required
              />
            </div>

            <FormField
              label="Email Address"
              name="email"
              type="email"
              value={values.email}
              onChange={(event) =>
                updateField("email", event.target.value)
              }
              error={errors.email}
              autoComplete="off"
              maxLength={254}
              helpText="An invitation may be sent to this address."
              placeholder="staff@municipality.gov.za"
              disabled={submitting}
              required
            />

            <div className={styles.sectionHeading}>
              <h2>Staff Access</h2>
              <p>
                The selected role determines the permissions
                granted to this staff member.
              </p>
            </div>

            <FormField
              label="Staff Role"
              name="role"
              as="select"
              value={values.role}
              options={STAFF_ROLES}
              placeholder="Select a role"
              onChange={(event) =>
                updateField("role", event.target.value)
              }
              error={errors.role}
              disabled={submitting}
              required
            />

            {selectedRole && (
              <p className={styles.roleHint}>
                {selectedRole.hint}
              </p>
            )}

            <FormField
              label="Department"
              name="department"
              value={values.department}
              onChange={(event) =>
                updateField("department", event.target.value)
              }
              error={errors.department}
              maxLength={100}
              placeholder="e.g. Water and Sanitation"
              helpText="Optional. Leave blank if not yet assigned."
              disabled={submitting}
            />

            <div className={styles.notice}>
              <strong>Before submitting</strong>
              <p>
                This action creates or links a staff account.
                New users may receive an invitation email.
                Verify the email address and role carefully.
              </p>
            </div>

            <ErrorBanner
              message={serverError}
              onDismiss={() => setServerError("")}
            />

            <div className={styles.actions}>
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting}
              >
                {submitting
                  ? "Adding Staff Member..."
                  : "Add Staff Member"}
              </Button>

              <Link
                to="/admin/team"
                className={styles.cancelLink}
              >
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      )}
    </section>
  );
}
