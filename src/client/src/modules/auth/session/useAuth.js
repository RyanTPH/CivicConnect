import { useContext } from "react";
import { AuthContext } from "../session/AuthContext.js";

// Reusable hook for accessing CivicConnect authentication.
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}