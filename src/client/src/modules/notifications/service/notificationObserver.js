import { subscribe } from "../../../shared/events/eventBus";

export function observeRequestStatusNotifications(onNotification) {
  return subscribe("request.statusChanged", ({ requestId, newStatus }) => {
    onNotification({
      serviceRequestId: requestId,
      status: newStatus,
      message: `Request status updated to ${newStatus}.`,
    });
  });
}
