import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "../session/useAuth";
import LogoutButton from "./LogoutButton";
import PageHeader from "../../../shared/ui/PageHeader";
import LoadingState from "../../../shared/ui/LoadingState";

// Displayed when an authenticated user lacks the required role.
export default function Unauthorized() {
  const { access, loading } = useAuth();

  const homeByRole = {
  staff: "/staff/dashboard",
  manager: "/manager/dashboard",
  admin: "/admin/dashboard",
};

const returnPath = access?.staffRole
  ? homeByRole[access.staffRole]
  : access?.isRequester
    ? "/dashboard"
    : null;

  // Wait until the user's current permissions have been resolved.
  if (loading) {
    return <LoadingState message="Checking your account permissions..." />;
  }

  return (
    <main
      style={{
        maxWidth: "600px",
        margin: "4rem auto",
        padding: "1.5rem",
      }}
    >
      <ShieldAlert
        size={40}
        aria-hidden="true"
        style={{ marginBottom: "1rem" }}
      />

      <PageHeader
        title="Access Denied"
        description="Your account does not have permission to access this page."
      />

      {access?.isRequester ? (
        <Link to="/dashboard">Return to Dashboard</Link>
      ) : (
        <LogoutButton />
      )}

      {access?.isStaff && access.staffRole === "staff" && (
        <Link to={returnPath}>Return to Staff Dashboard</Link>
      )}
    </main>
  );
}
