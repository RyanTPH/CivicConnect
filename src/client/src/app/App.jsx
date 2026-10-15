import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AppLayout from "./layout/AppLayout.jsx";
//import PlaceholderPage from "./pages/PlaceholderPage.jsx";

import {
  Login,
  Register,
  ProtectedRoute,
  Unauthorised,
  useAuth,
} from "../modules/auth";

import {
  RequestForm,
  MyRequestsPage,
  RequestDetailsPage,
} from "../modules/requests";

import { ProfilePage } from "../modules/profile";
import { StaffDashboardPage, StaffRequestPage, } from "../modules/staff";
import { ManagementDashboardPage } from "../modules/management";
import LoadingState from "../shared/ui/LoadingState";
import ErrorBanner from "../shared/ui/ErrorBanner";

// Direct authenticated users to their authorised portal.
function PortalHomeRedirect() {
  const { user, access, loading, accessError } = useAuth();

  if (loading) {
    return <LoadingState message="Checking your account..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (accessError) {
    return (
      <ErrorBanner
        message="Unable to verify your account permissions."
      />
    );
  }

  // Requester accounts open the requester portal.
  if (access?.isRequester) {
    return <Navigate to="/dashboard" replace />;
  }

  // General staff accounts open the staff portal.
  if (access?.isStaff && access.staffRole === "staff") {
    return <Navigate to="/staff/dashboard" replace />;
  }

  if (access?.isStaff && access.staffRole === "manager") {
  return <Navigate to="/manager/dashboard" replace />;
}

if (access?.isStaff && access.staffRole === "admin") {
  return <Navigate to="/admin/dashboard" replace />;
}

  return <Navigate to="/unauthorised" replace />;

}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public authentication pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* All routes below require authentication */}
        <Route element={<ProtectedRoute />}>

        <Route
            path="/"
            element={<PortalHomeRedirect />}
          />

          <Route
            path="/unauthorised"
            element={<Unauthorised />}
          />


          {/* Requester portal */}
          <Route
            element={
              <ProtectedRoute requiredAccess="requester" />
            }
          >
            <Route
              element={<AppLayout portal="requester" />}
            >
              <Route
                path="/dashboard"
                element={<MyRequestsPage />}
              />

              <Route
                path="/requests"
                element={
                  <Navigate
                    to="/dashboard#requests"
                    replace
                  />
                }
              />

              <Route
                path="/requests/new"
                element={<RequestForm />}
              />

              <Route
                path="/requests/:requestId"
                element={<RequestDetailsPage />}
              />

              <Route
                path="/profile"
                element={<ProfilePage portal="requester" />}
              />
            </Route>
          </Route>

          {/* General staff portal */}
          <Route
            element={
              <ProtectedRoute
                requiredAccess="staff"
                allowedStaffRoles={["staff"]}
              />
            }
          >
            <Route element={<AppLayout portal="staff" />}>
              <Route
                path="/staff/dashboard"
                element={<StaffDashboardPage />}
              />

              <Route
                path="/staff/requests/:requestId"
                element={
                  <StaffRequestPage/>
                }
              />

              <Route
                path="/staff/profile"
                element={<ProfilePage portal="staff" />}
              />
            </Route>
          </Route>

{/* Management portal: manager accounts only. */}
<Route
  element={
    <ProtectedRoute
      requiredAccess="staff"
      allowedStaffRoles={["manager"]}
    />
  }
>
  <Route element={<AppLayout portal="manager" />}>
    <Route
      path="/manager/dashboard"
      element={
        <ManagementDashboardPage portal="manager" />
      }
    />

    <Route
      path="/manager/profile"
      element={<ProfilePage portal="manager" />}
    />
  </Route>
</Route>


{/* Administration portal: admin accounts only. */}
<Route
  element={
    <ProtectedRoute
      requiredAccess="staff"
      allowedStaffRoles={["admin"]}
    />
  }
>
  <Route element={<AppLayout portal="admin" />}>
    <Route
      path="/admin/dashboard"
      element={
        <ManagementDashboardPage portal="admin" />
      }
    />

    <Route
      path="/admin/profile"
      element={<ProfilePage portal="admin" />}
    />
  </Route>
</Route>

        </Route>

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
