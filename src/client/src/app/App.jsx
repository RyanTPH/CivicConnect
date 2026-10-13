import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layout/AppLayout.jsx";
import {Login,ProtectedRoute,} from "../modules/auth";
import PlaceholderPage from "./pages/PlaceholderPage.jsx";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public authentication route */}
        <Route path="/login" element={<Login />} />

        {/* Authentication required for CivicConnect pages */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route element={<AppLayout />}>
            <Route
              path="/dashboard"
              element={
                <PlaceholderPage
                  title="Welcome to CivicConnect"
                  description="View and manage your service requests."
                />
              }
            />

            <Route
              path="/requests"
              element={
                <PlaceholderPage
                  title="My Requests"
                  description="View your submitted service requests."
                />
              }
            />

            <Route
              path="/requests/new"
              element={
                <PlaceholderPage
                  title="File a Complaint"
                  description="Submit a new municipal service request."
                />
              }
            />

            <Route
              path="/requests/:requestId"
              element={
                <PlaceholderPage
                  title="Request Details"
                  description="View request information and status history."
                />
              }
            />

            <Route
              path="/track"
              element={
                <PlaceholderPage
                  title="Track Complaint"
                  description="Track the progress of a service request."
                />
              }
            />

            <Route
              path="/notifications"
              element={
                <PlaceholderPage
                  title="Notifications"
                  description="View updates about your requests."
                />
              }
            />

            <Route
              path="/profile"
              element={
                <PlaceholderPage
                  title="My Profile"
                  description="Manage your account information."
                />
              }
            />
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
