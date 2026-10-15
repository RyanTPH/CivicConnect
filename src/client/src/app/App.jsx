import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layout/AppLayout.jsx";
import {Login,Register,ProtectedRoute,Unauthorised,} from "../modules/auth";
//import PlaceholderPage from "./pages/PlaceholderPage.jsx";
import { RequestForm,MyRequestsPage,RequestDetailsPage } from "../modules/requests";
import { ProfilePage } from "../modules/requester";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public authentication route */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Authentication required for CivicConnect pages */}
        <Route element={<ProtectedRoute />}>

          <Route path="/unauthorised" element={<Unauthorised />} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route element = {<ProtectedRoute requiredAccess="requester"/>}>

          <Route element={<AppLayout />}>
            <Route
              path="/dashboard"
              element={
                <MyRequestsPage />
              }
            />

            <Route
              path="/requests"
              element={
                <Navigate to="/dashboard#requests" replace />
              }
            />

            <Route
              path="/requests/new"
              element={<RequestForm/>}
            />

            <Route
              path="/requests/:requestId"
              element={
               <RequestDetailsPage/>
              }
            />


            <Route
              path="/profile"
              element={
                <ProfilePage />
              }
            />

            
          </Route>
         
         </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />


      </Routes>
    </BrowserRouter>
  );
}
