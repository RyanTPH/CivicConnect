
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/lib/supabaseClient", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from "../../../shared/lib/supabaseClient";
import { changeRequestStatus } from "../repository/supabaseRequestStatusRepository";

describe("Request Status Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the status-change RPC with the correct parameters", async () => {
    supabase.rpc.mockResolvedValue({ error: null });

    await changeRequestStatus(
      "request-1",
      "In Progress",
      "Work has started"
    );

    expect(supabase.rpc).toHaveBeenCalledWith(
      "change_request_status",
      {
        p_request_id: "request-1",
        p_new_status: "In Progress",
        p_note: "Work has started",
      }
    );
  });

  it("trims whitespace from input values", async () => {
    supabase.rpc.mockResolvedValue({ error: null });

    await changeRequestStatus(
      " request-1 ",
      " In Progress ",
      " Work has started "
    );

    expect(supabase.rpc).toHaveBeenCalledWith(
      "change_request_status",
      {
        p_request_id: "request-1",
        p_new_status: "In Progress",
        p_note: "Work has started",
      }
    );
  });

  it("rejects a missing request ID", async () => {
    await expect(
      changeRequestStatus("", "In Progress", "Work started")
    ).rejects.toThrow(
      "Request ID, new status and note are required."
    );

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("rejects a missing status", async () => {
    await expect(
      changeRequestStatus("request-1", "", "Work started")
    ).rejects.toThrow(
      "Request ID, new status and note are required."
    );

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("rejects a missing note", async () => {
    await expect(
      changeRequestStatus("request-1", "In Progress", "")
    ).rejects.toThrow(
      "Request ID, new status and note are required."
    );

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("rejects non-string inputs", async () => {
    await expect(
      changeRequestStatus(123, "In Progress", "Work started")
    ).rejects.toThrow(
      "Request ID, new status and note are required."
    );

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("handles permission errors returned by Supabase", async () => {
    supabase.rpc.mockResolvedValue({
      error: { message: "Permission denied" },
    });

    await expect(
      changeRequestStatus(
        "request-1",
        "In Progress",
        "Work started"
      )
    ).rejects.toThrow(
      "Unable to change request status: Permission denied"
    );
  });

  it("handles invalid status-transition errors", async () => {
    supabase.rpc.mockResolvedValue({
      error: { message: "Invalid status transition" },
    });

    await expect(
      changeRequestStatus(
        "request-1",
        "Resolved",
        "Attempting transition"
      )
    ).rejects.toThrow(
      "Unable to change request status: Invalid status transition"
    );
  });

  it("handles other database errors", async () => {
    supabase.rpc.mockResolvedValue({
      error: { message: "Database unavailable" },
    });

    await expect(
      changeRequestStatus(
        "request-1",
        "In Progress",
        "Work started"
      )
    ).rejects.toThrow(
      "Unable to change request status: Database unavailable"
    );
  });
});
