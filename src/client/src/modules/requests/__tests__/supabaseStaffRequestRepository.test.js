
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import { supabase } from "../../../shared/lib/supabaseClient";
import {
  getStaffRequests,
  assignStaffRequest,
  unassignStaffRequest,
} from "../repository/supabaseStaffRequestRepository";

describe("Staff Request Repository", () => {
  let query;

  beforeEach(() => {
    vi.clearAllMocks();

    query = {
      select: vi.fn(),
      order: vi.fn(),
      eq: vi.fn(),
      then: vi.fn(),
    };

    query.select.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.eq.mockReturnValue(query);

    supabase.from.mockReturnValue(query);

    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "staff-user-1" } },
      error: null,
    });

    query.then.mockImplementation((resolve, reject) =>
      Promise.resolve({
        data: [{ id: "request-1", status: "Submitted" }],
        error: null,
      }).then(resolve, reject)
    );
  });

  it("retrieves requests for a signed-in user", async () => {
    const requests = await getStaffRequests();

    expect(supabase.from).toHaveBeenCalledWith("service_requests");
    expect(query.select).toHaveBeenCalledWith("*");
    expect(query.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });

    expect(requests).toEqual([
      { id: "request-1", status: "Submitted" },
    ]);
  });

  it("applies category, status and priority filters", async () => {
    await getStaffRequests({
      category: "Water",
      status: "Submitted",
      priority: "High",
    });

    expect(query.eq).toHaveBeenCalledWith("category", "Water");
    expect(query.eq).toHaveBeenCalledWith("status", "Submitted");
    expect(query.eq).toHaveBeenCalledWith("priority", "High");
  });

  it("rejects unauthenticated users", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(getStaffRequests()).rejects.toThrow(
      "A signed-in staff member is required."
    );

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("handles authentication errors", async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid session" },
    });

    await expect(getStaffRequests()).rejects.toThrow(
      "A signed-in staff member is required."
    );
  });

  it("handles Supabase query errors", async () => {
    query.then.mockImplementation((resolve, reject) =>
      Promise.resolve({
        data: null,
        error: { message: "Permission denied" },
      }).then(resolve, reject)
    );

    await expect(getStaffRequests()).rejects.toThrow(
      "Unable to retrieve staff requests: Permission denied"
    );
  });

  it("returns an empty array when no requests exist", async () => {
    query.then.mockImplementation((resolve, reject) =>
      Promise.resolve({
        data: null,
        error: null,
      }).then(resolve, reject)
    );

    await expect(getStaffRequests()).resolves.toEqual([]);
  });

  it("rejects unsupported filters before querying", async () => {
    await expect(
      getStaffRequests({ department: "Finance" })
    ).rejects.toThrow("Unsupported request filter: department");

    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe("Staff Request Assignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assigns a request using the existing Supabase RPC", async () => {
    supabase.rpc.mockResolvedValue({ error: null });

    await assignStaffRequest(
      "request-1",
      "staff-1",
      "Assigned for investigation"
    );

    expect(supabase.rpc).toHaveBeenCalledWith("assign_request", {
      p_request_id: "request-1",
      p_staff_id: "staff-1",
      p_reason: "Assigned for investigation",
    });
  });

  it("unassigns a request using the existing Supabase RPC", async () => {
    supabase.rpc.mockResolvedValue({ error: null });

    await unassignStaffRequest(
      "request-1",
      "Reassignment required"
    );

    expect(supabase.rpc).toHaveBeenCalledWith("unassign_request", {
      p_request_id: "request-1",
      p_reason: "Reassignment required",
    });
  });

  it("rejects assignment when required inputs are missing", async () => {
    await expect(
      assignStaffRequest("", "staff-1", "Assignment reason")
    ).rejects.toThrow(
      "Request ID, staff ID and reason are required."
    );

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("rejects unassignment when the reason is missing", async () => {
    await expect(
      unassignStaffRequest("request-1", "")
    ).rejects.toThrow(
      "Request ID and reason are required."
    );

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("handles assignment permission errors", async () => {
    supabase.rpc.mockResolvedValue({
      error: { message: "Permission denied" },
    });

    await expect(
      assignStaffRequest(
        "request-1",
        "staff-1",
        "Assignment reason"
      )
    ).rejects.toThrow(
      "Unable to assign request: Permission denied"
    );
  });

  it("handles unassignment permission errors", async () => {
    supabase.rpc.mockResolvedValue({
      error: { message: "Permission denied" },
    });

    await expect(
      unassignStaffRequest(
        "request-1",
        "Unassignment reason"
      )
    ).rejects.toThrow(
      "Unable to unassign request: Permission denied"
    );
  });
});
