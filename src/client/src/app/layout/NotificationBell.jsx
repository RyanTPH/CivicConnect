import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bell, RefreshCw, X } from "lucide-react";

import { useAuth } from "../../modules/auth";
import { supabase } from "../../shared/lib/supabaseClient";
import { observeRequestStatusNotifications } from "../../modules/notifications/service/notificationObserver";

import layoutStyles from "./AppLayout.module.css";
import styles from "./NotificationBell.module.css";

const POLL_INTERVAL_MS = 15000;

const EVENT_TITLES = {
  accepted: "Request Accepted",
  rejected: "Request Rejected",
  updated: "Request Updated",
  resolved: "Request Resolved",
  closed: "Request Closed",
  comment_added: "New Comment",
};

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getTitle(notification) {
  return EVENT_TITLES[notification.event_type] ?? "Request Notification";
}

function getMessage(notification) {
  if (notification.event_type === "comment_added") {
    return "A new comment has been added to a service request.";
  }

  if (notification.status_snapshot) {
    return `Your service request status is now ${notification.status_snapshot}.`;
  }

  return "There is an update to your service request.";
}

// Shared header notification popover for authenticated portals.
export default function NotificationBell({ portal = "requester" }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [notificationState, setNotificationState] = useState({
    userId: null,
    items: [],
    loading: false,
    error: "",
  });

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [markReadError, setMarkReadError] = useState("");

  const containerRef = useRef(null);
  const bellRef = useRef(null);
  const panelRef = useRef(null);
  const requestVersion = useRef(0);

  // Only display notifications loaded for the current account.
  const currentState =
    notificationState.userId === userId
      ? notificationState
      : { items: [], loading: true, error: "" };

  const notifications = currentState.items;
  const loading = currentState.loading;
  const error = currentState.error;

  const selectedNotification = notifications.find(
    (item) => item.notification_id === selectedId,
  );

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  // Retrieve only notifications authorised by the existing RPC.
  const loadNotifications = useCallback(async () => {
    const version = ++requestVersion.current;

    if (!userId || !supabase) {
      setNotificationState({
        userId,
        items: [],
        loading: false,
        error: "Notifications are unavailable.",
      });
      return;
    }

    setNotificationState((previous) => ({
      userId,
      items: previous.userId === userId ? previous.items : [],
      loading: true,
      error: "",
    }));

    try {
      const { data, error: fetchError } = await supabase.rpc(
        "get_my_notifications",
      );

      if (version !== requestVersion.current) return;
      if (fetchError) throw fetchError;

      setNotificationState({
        userId,
        items: data ?? [],
        loading: false,
        error: "",
      });
    } catch {
      if (version !== requestVersion.current) return;

      setNotificationState((previous) => ({
        userId,
        items: previous.userId === userId ? previous.items : [],
        loading: false,
        error: "Unable to load notifications. Please try again.",
      }));
    }
  }, [userId]);

  // Open the notification and persist its read state in Supabase.
  async function handleSelectNotification(notification) {
    setSelectedId(notification.notification_id);
    setMarkReadError("");

    // Already-read notifications don't require another database call.
    if (notification.read_at) return;

    if (!supabase) {
      setMarkReadError("Notifications are not configured.");
      return;
    }

    try {
      const { error } = await supabase.rpc("mark_my_notification_read", {
        p_notification_id: notification.notification_id,
      });

      if (error) throw error;

      // Read the database state again so the unread count is accurate.
      await loadNotifications();
    } catch {
      setMarkReadError(
        "This notification could not be marked as read. Please try again.",
      );
    }
  }

  // Refresh on mount, successful local status changes and polling.
  useEffect(() => {
    if (!userId) return;

    const initialLoad = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    const unsubscribe = observeRequestStatusNotifications(() => {
      void loadNotifications();
    });

    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void loadNotifications();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      unsubscribe();

      // Ignore results from requests started before cleanup.
      requestVersion.current += 1;
    };
  }, [userId, loadNotifications]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
        setSelectedId(null);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
        setSelectedId(null);
        bellRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Move keyboard focus into the popup when it opens.
  useEffect(() => {
    if (!open) return;

    panelRef.current?.querySelector("button")?.focus();
  }, [open, selectedId]);

  function closePopup() {
    setOpen(false);
    setSelectedId(null);
    bellRef.current?.focus();
  }

  function openRelatedRequest(notification) {
    if (!notification.service_request_id) return;

    const basePath = {
  requester: "/requests",
  staff: "/staff/requests",
  manager: "/manager/my-requests",
  admin: "/admin/requests",
}[portal] ?? "/requests";

    const requestPath = `${basePath}/${encodeURIComponent(
      notification.service_request_id,
    )}`;

    closePopup();
    navigate(requestPath);
  }

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        ref={bellRef}
        type="button"
        className={`${layoutStyles.notificationButton} ${styles.bellButton}`}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "View notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notification-popover"
        onClick={() => {
          setOpen((previous) => !previous);
          setSelectedId(null);

          if (!open) {
            void loadNotifications();
          }
        }}
      >
        <Bell size={22} aria-hidden="true" />

        {unreadCount > 0 && (
          <span className={styles.count} aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          id="notification-popover"
          ref={panelRef}
          className={styles.panel}
          role="dialog"
          aria-label="Notifications"
          aria-modal="false"
        >
          <div className={styles.heading}>
            <div className={styles.headingLeft}>
              {selectedNotification && (
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="Back to notification list"
                  onClick={() => setSelectedId(null)}
                >
                  <ArrowLeft size={19} />
                </button>
              )}

              <h2>
                {selectedNotification
                  ? "Notification Details"
                  : "Notifications"}
              </h2>
            </div>

            <div className={styles.headingActions}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Refresh notifications"
                onClick={() => void loadNotifications()}
                disabled={loading}
              >
                <RefreshCw size={17} />
              </button>

              <button
                type="button"
                className={styles.iconButton}
                aria-label="Close notifications"
                onClick={closePopup}
              >
                <X size={19} />
              </button>
            </div>
          </div>

          {loading && notifications.length === 0 && (
            <p className={styles.message} role="status">
              Loading notifications...
            </p>
          )}

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          {!selectedNotification &&
            !loading &&
            !error &&
            notifications.length === 0 && (
              <p className={styles.message}>No notifications yet.</p>
            )}

          {selectedNotification ? (
            <div className={styles.details}>
              <h3>{getTitle(selectedNotification)}</h3>

              <p>{getMessage(selectedNotification)}</p>

              <dl className={styles.metadata}>
  {selectedNotification.event_type !== "comment_added" && (
    <div>
      <dt>Status</dt>
      <dd>
        {selectedNotification.status_snapshot ?? "Not available"}
      </dd>
    </div>
  )}

  <div>
    <dt>Received</dt>
    <dd>
      {formatDate(selectedNotification.created_at)}
    </dd>
  </div>
</dl>

              {selectedNotification.service_request_id && (
                <button
                  type="button"
                  className={styles.viewRequest}
                  onClick={() => openRelatedRequest(selectedNotification)}
                >
                  {markReadError && (
                    <p className={styles.error} role="alert">
                      {markReadError}
                    </p>
                  )}
                  View Request
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              )}
            </div>
          ) : (
            <div className={styles.list}>
              {notifications.map((notification) => (
                <button
                  key={notification.notification_id}
                  type="button"
                  className={`${styles.item} ${
                    !notification.read_at ? styles.unread : ""
                  }`}
                  onClick={() => void handleSelectNotification(notification)}
                >
                  <span className={styles.itemTop}>
                    <strong>{getTitle(notification)}</strong>

                    {!notification.read_at && (
                      <span className={styles.unreadDot} aria-label="Unread" />
                    )}
                  </span>

                  <span className={styles.itemMessage}>
                    {getMessage(notification)}
                  </span>

                  <time className={styles.date}>
                    {formatDate(notification.created_at)}
                  </time>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
