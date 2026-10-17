import { describe, it, expect, vi } from "vitest";
import { publish } from "../../../shared/events/eventBus";
import { observeRequestStatusNotifications } from "../service/notificationObserver";

describe("Notification Observer", () => {
  it("receives a notification when request status changes", () => {
    const callback = vi.fn();
    const unsubscribe = observeRequestStatusNotifications(callback);

    try {
      publish("request.statusChanged", {
        requestId: "test-request-1",
        newStatus: "Accepted",
      });

      expect(callback).toHaveBeenCalledWith({
        serviceRequestId: "test-request-1",
        status: "Accepted",
        message: "Request status updated to Accepted.",
      });
    } finally {
      unsubscribe();
    }
  });

  it("stops receiving events after unsubscribing", () => {
    const callback = vi.fn();
    const unsubscribe = observeRequestStatusNotifications(callback);

    unsubscribe();

    publish("request.statusChanged", {
      requestId: "test-request-2",
      newStatus: "Resolved",
    });

    expect(callback).not.toHaveBeenCalled();
  });
});
