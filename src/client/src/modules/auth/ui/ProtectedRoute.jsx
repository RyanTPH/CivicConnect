import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../session/useAuth";
import LoadingState from "../../../shared/ui/LoadingState";

// Requires a Supabase login before rendering child routes.
export default function ProtectedRoute() {
  const {
    user,
    loading,
    isSupabaseConfigured,
  } = useAuth();

  const location = useLocation();

  if (!isSupabaseConfigured) {
    return (
      <main style={{ padding: "2rem" }} role="alert">
        <h1>Supabase configuration required</h1>
        <p>
          Add your public Supabase credentials to the
          frontend .env file and restart Vite.
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <LoadingState message="Checking your session..." />
    );
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

  return <Outlet />;
}