
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { supabase } from "../../shared/lib/supabaseClient";
import { observeRequestStatusNotifications } from "../../modules/notifications/service/notificationObserver";
import styles from "./AppLayout.module.css";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setLoading(true);

    const { data, error: fetchError } = await supabase.rpc(
      "get_my_notifications"
    );

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setNotifications(data ?? []);
      setError("");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(loadNotifications, 0);

    const unsubscribe = observeRequestStatusNotifications(
      loadNotifications
    );

    const interval = setInterval(loadNotifications, 15000);

    return () => {
      clearTimeout(initialLoad);
      unsubscribe();
      clearInterval(interval);
    };
  }, [loadNotifications]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.read_at
  ).length;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        className={styles.notificationButton}
        onClick={() => {
          setOpen((previous) => !previous);
          if (!open) loadNotifications();
        }}
        aria-label="View notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        style={{ border: "none", cursor: "pointer", position: "relative" }}
      >
        <Bell size={22} aria-hidden="true" />

        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              background: "#e53935",
              color: "white",
              borderRadius: "50%",
              minWidth: 18,
              height: 18,
              fontSize: 11,
              display: "grid",
              placeItems: "center",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="Notifications"
          style={{
            position: "absolute",
            top: "calc(100% + 12px)",
            right: 0,
            width: "min(360px, 85vw)",
            maxHeight: 430,
            overflowY: "auto",
            background: "white",
            color: "#172b4d",
            borderRadius: 12,
            border: "1px solid #ddd",
            boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 16,
              borderBottom: "1px solid #eee",
            }}
          >
            <strong>Notifications</strong>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {loading && notifications.length === 0 && (
            <p style={{ padding: 16 }}>Loading...</p>
          )}

          {error && (
            <p role="alert" style={{ padding: 16 }}>
              {error}
            </p>
          )}

          {!loading && !error && notifications.length === 0 && (
            <p style={{ padding: 16 }}>No notifications yet.</p>
          )}

          {notifications.map((notification) => (
            <div
              key={notification.notification_id}
              style={{
                padding: 16,
                borderBottom: "1px solid #eee",
                background: notification.read_at
                  ? "white"
                  : "#f0f6ff",
              }}
            >
              <strong>
                Request {notification.event_type}
              </strong>

              <p style={{ margin: "6px 0", fontSize: 13 }}>
                Your request status is now{" "}
                <strong>{notification.status_snapshot}</strong>.
              </p>

              <small style={{ color: "#64748b" }}>
                {new Date(notification.created_at).toLocaleString()}
              </small>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
