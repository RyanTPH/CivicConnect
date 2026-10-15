import { useEffect, useRef } from "react";

import { supabase } from "../../../shared/lib/supabaseClient";

// Inactivity timeout agreed for the frontend implementation.
export const INACTIVITY_MINUTES = 30;

const INACTIVITY_MS = INACTIVITY_MINUTES * 60 * 1000;

// Sign out the current browser session after inactivity.
export function useInactivityLogout({ userId, onExpired }) {
  const onExpiredRef = useRef(onExpired);

  // Keep the latest callback without restarting the inactivity timer.
  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  useEffect(() => {
    if (!userId || !supabase) return;

    let lastActivityAt = Date.now();
    let signOutStarted = false;
    let timeoutId;

    async function expireSession() {
      if (signOutStarted) return;

      signOutStarted = true;
      window.clearTimeout(timeoutId);

      try {
        // End this browser session, not every device session.
        const { error } = await supabase.auth.signOut({
          scope: "local",
        });

        if (error) throw error;

        onExpiredRef.current?.();
      } catch (error) {
        // Keep the session state consistent if sign-out fails.
        console.error("Inactivity sign-out failed:", error);

        signOutStarted = false;

        // Retry shortly; do not treat a failed logout as success.
        timeoutId = window.setTimeout(checkInactivity, 30_000);
      }
    }

    function checkInactivity() {
      if (signOutStarted) return;

      const elapsed = Date.now() - lastActivityAt;
      const remaining = INACTIVITY_MS - elapsed;

      if (remaining <= 0) {
        void expireSession();
        return;
      }

      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(
        checkInactivity,
        remaining
      );
    }

    function handleActivity() {
      if (signOutStarted) return;

      // Returning after the timeout must not renew an expired session.
      if (Date.now() - lastActivityAt >= INACTIVITY_MS) {
        void expireSession();
        return;
      }

      lastActivityAt = Date.now();
      checkInactivity();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkInactivity();
      }
    }

    const activityEvents = [
      "pointerdown",
      "keydown",
      "wheel",
      "touchstart",
    ];

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, handleActivity, {
        passive: true,
      });
    }

    window.addEventListener("focus", checkInactivity);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    // Begin counting inactivity for the authenticated user.
    checkInactivity();

    return () => {
      window.clearTimeout(timeoutId);

      for (const eventName of activityEvents) {
        window.removeEventListener(
          eventName,
          handleActivity
        );
      }

      window.removeEventListener(
        "focus",
        checkInactivity
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [userId]);
}