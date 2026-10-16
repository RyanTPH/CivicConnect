-- ============================================================
-- CivicConnect: Comment Notification Event
-- ============================================================
-- Add an event type for requester/staff comment notifications.
-- Existing notification event types remain unchanged.

ALTER TYPE public.notification_event
ADD VALUE IF NOT EXISTS 'comment_added';