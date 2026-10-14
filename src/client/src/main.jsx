import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AuthProvider } from "./modules/auth";
import App from "./app/App.jsx";
import "./index.css";

// Make authentication available throughout the application.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
