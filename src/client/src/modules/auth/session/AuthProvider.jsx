import { useCallback, useEffect, useState } from "react";

import {
  supabase,
  isSupabaseConfigured,
} from "../../../shared/lib/supabaseClient";

import { getUserAccess } from "../service/authService";
import { AuthContext } from "./AuthContext";
import { useInactivityLogout } from "./useInactivityLogout";

// Manage Supabase authentication and resolved portal permissions.
export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured);

  const [access, setAccess] = useState(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState(false);
  const [verifiedUserId, setVerifiedUserId] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Show a message when the inactivity timeout ends a session.
const handleSessionExpired = useCallback(() => {
  setSessionExpired(true);
}, []);

useInactivityLogout({
  userId: session?.user?.id,
  onExpired: handleSessionExpired,
});

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    let revision = 0;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;

      if (event === "SIGNED_IN") {
  setSessionExpired(false);
}

      // A refreshed token does not require a fresh role lookup.
      if (event === "TOKEN_REFRESHED") {
        setSession(nextSession);
        return;
      }

      if (
        ![
          "INITIAL_SESSION",
          "SIGNED_IN",
          "SIGNED_OUT",
          "USER_UPDATED",
        ].includes(event)
      ) {
        return;
      }

      const currentRevision = ++revision;

      setSession(nextSession);
      setSessionLoading(false);
      setAccess(null);
      setAccessError(false);
      setVerifiedUserId(null);

      if (!nextSession?.user) {
        setAccessLoading(false);
        return;
      }

      setAccessLoading(true);

      // Defer Supabase queries outside the auth callback.
      setTimeout(async () => {
        if (!active || currentRevision !== revision) return;

        try {
          const result = await getUserAccess(nextSession.user.id);

          if (active && currentRevision === revision) {
            setAccess(result);
          }
        } catch {
          if (active && currentRevision === revision) {
            setAccessError(true);
          }
        } finally {
          if (active && currentRevision === revision) {
            setVerifiedUserId(nextSession.user.id);
            setAccessLoading(false);
          }
        }
      }, 0);
    });

    return () => {
      active = false;
      revision++;
      subscription.unsubscribe();
    };
  }, []);


  // Register a requester through Supabase Auth.
  // The database trigger creates the matching requester profile.
  async function signUp({ firstName, lastName, email, password }) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) throw error;

    return data;
  }

  // Sign in using Supabase email/password authentication.
  async function signIn(email, password) {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return data;
  }

  // End the current Supabase session.
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
        access,
        loading:
          sessionLoading ||
          (Boolean(session?.user) &&
            (accessLoading || verifiedUserId !== session.user.id)),
        accessError,
        isSupabaseConfigured,
        sessionExpired,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
