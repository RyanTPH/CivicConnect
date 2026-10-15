import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateRequestStatus } from "../service/requestStatusService";
import { changeRequestStatus } from "../repository/supabaseRequestStatusRepository";

vi.mock("../repository/supabaseRequestStatusRepository", () => ({
  changeRequestStatus: vi.fn(),
}));

describe("updateRequestStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the repository with valid inputs", async () => {
    await updateRequestStatus(
      "request-123",
      "Accepted",
      "Request reviewed"
    );

    expect(changeRequestStatus).toHaveBeenCalledWith(
      "request-123",
      "Accepted",
      "Request reviewed"
    );
  });

  it("trims whitespace from status and note", async () => {
    await updateRequestStatus(
      "request-123",
      "  In Progress  ",
      "  Work started  "
    );

    expect(changeRequestStatus).toHaveBeenCalledWith(
      "request-123",
      "In Progress",
      "Work started"
    );
  });

  it("rejects an invalid status", async () => {
    await expect(
      updateRequestStatus("request-123", "Pending", "Testing")
    ).rejects.toThrow("Invalid request status.");

    expect(changeRequestStatus).not.toHaveBeenCalled();
  });

  it("rejects an empty note", async () => {
    await expect(
      updateRequestStatus("request-123", "Accepted", "   ")
    ).rejects.toThrow("A note is required");

    expect(changeRequestStatus).not.toHaveBeenCalled();
  });

  it("rejects a non-string status", async () => {
    await expect(
      updateRequestStatus("request-123", null, "Testing")
    ).rejects.toThrow("Invalid request status.");
  });

  it("passes repository errors back to the caller", async () => {
    changeRequestStatus.mockRejectedValueOnce(
      new Error("Permission denied")
    );

    await expect(
      updateRequestStatus("request-123", "Accepted", "Testing")
    ).rejects.toThrow("Permission denied");
  });
});