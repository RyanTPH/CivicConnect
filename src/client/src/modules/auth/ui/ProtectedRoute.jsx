import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../session/useAuth";
import LoadingState from "../../../shared/ui/LoadingState";
import ErrorBanner from "../../../shared/ui/ErrorBanner";

// Protect routes using authentication and optional portal permissions.
export default function ProtectedRoute({
  requiredAccess,
  allowedStaffRoles,
}) {
  const {
    user,
    access,
    loading,
    accessError,
    isSupabaseConfigured,
  } = useAuth();

  const location = useLocation();

  if (!isSupabaseConfigured) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>Supabase configuration required</h1>
        <p role="alert">
          Check the frontend environment variables.
        </p>
      </main>
    );
  }

  if (loading) {
    return <LoadingState message="Verifying account access..." />;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // Authentication-only routes need no database role lookup.
  if (!requiredAccess) {
    return <Outlet />;
  }


  if (accessError) {
    return (
      <main style={{ padding: "2rem" }}>
        <ErrorBanner
          message="Unable to verify your account permissions. Please try again later."
        />
      </main>
    );
  }

  if (!access) {
    return <Navigate to="/unauthorised" replace />;
  }

  if (requiredAccess === "requester" && !access.isRequester) {
    return <Navigate to="/unauthorised" replace />;
  }

  if (requiredAccess === "staff") {
    const permitted =
      access.isStaff &&
      (!allowedStaffRoles ||
        allowedStaffRoles.includes(access.staffRole));

    if (!permitted) {
      return <Navigate to="/unauthorised" replace />;
    }
  }

  return <Outlet />;
}