import { useEffect, useState } from "react";
import {
  isSupabaseConfigured,
  supabase,
} from "../../../shared/lib/supabaseClient";
import { AuthContext } from "./AuthContext";

// Shares the current Supabase session across CivicConnect.
export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(
    isSupabaseConfigured
  );

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    // INITIAL_SESSION restores an existing login on app startup.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!active) return;

        if (
          event === "INITIAL_SESSION" ||
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          setSession(nextSession);
          setLoading(false);
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Authenticate using an existing Supabase Auth account.
  async function signIn(email, password) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) throw error;

    return data;
  }

  // Sign out and allow protected routes to redirect to login.
  async function signOut() {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { error } = await supabase.auth.signOut();

    if (error) throw error;
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        isSupabaseConfigured,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}