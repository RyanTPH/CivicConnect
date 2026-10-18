import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { listMyServiceRequests } from "../service/requestService";

// Mock the Supabase operations used by the read repository.
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  requesterSelect: vi.fn(),
  requesterEq: vi.fn(),
  requesterIs: vi.fn(),
  requesterSingle: vi.fn(),
  requestsSelect: vi.fn(),
  requestsEq: vi.fn(),
  requestsOrder: vi.fn(),
}));

vi.mock("../../../shared/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    from: mocks.from,
  },
}));

describe("listMyServiceRequests", () => {
  const sampleRequest = {
    service_request_id: "request-1",
    reference_number: "CC-2026-A1B2C3D4",
    title: "Broken streetlight",
    description: "The streetlight is not working.",
    category: "Electricity",
    status: "Submitted",
    priority: "Medium",
    created_at: "2026-10-10T12:00:00Z",
  };

  beforeEach(() => {
    vi.resetAllMocks();

    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    mocks.from.mockImplementation((table) => {
      if (table === "requesters") {
        return { select: mocks.requesterSelect };
      }

      if (table === "service_requests") {
        return { select: mocks.requestsSelect };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    mocks.requesterSelect.mockReturnValue({
      eq: mocks.requesterEq,
    });

    mocks.requesterEq.mockReturnValue({
      is: mocks.requesterIs,
    });

    mocks.requesterIs.mockReturnValue({
      maybeSingle: mocks.requesterSingle,
    });

    mocks.requesterSingle.mockResolvedValue({
      data: { requester_id: "requester-1" },
      error: null,
    });

    mocks.requestsSelect.mockReturnValue({
      eq: mocks.requestsEq,
    });

    mocks.requestsEq.mockReturnValue({
      order: mocks.requestsOrder,
    });

    mocks.requestsOrder.mockResolvedValue({
      data: [sampleRequest],
      error: null,
    });
  });

  it("loads only the current requester's records", async () => {
    const result = await listMyServiceRequests();

    expect(mocks.getUser).toHaveBeenCalled();
    expect(mocks.requesterEq).toHaveBeenCalledWith(
      "user_id",
      "user-1"
    );

    expect(mocks.requestsEq).toHaveBeenCalledWith(
      "requester_id",
      "requester-1"
    );

    expect(mocks.requestsOrder).toHaveBeenCalledWith(
      "created_at",
      { ascending: false }
    );

    expect(result).toEqual([sampleRequest]);
  });

  it("returns an empty list when there are no requests", async () => {
    mocks.requestsOrder.mockResolvedValue({
      data: [],
      error: null,
    });

    await expect(
      listMyServiceRequests()
    ).resolves.toEqual([]);
  });

  it("rejects unauthenticated access", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(
      listMyServiceRequests()
    ).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
    });

    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects a missing requester profile", async () => {
    mocks.requesterSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(
      listMyServiceRequests()
    ).rejects.toMatchObject({
      code: "PROFILE_NOT_FOUND",
    });

    expect(mocks.requestsSelect).not.toHaveBeenCalled();
  });

  it("handles requester profile permission errors", async () => {
    mocks.requesterSingle.mockResolvedValue({
      data: null,
      error: { code: "42501" },
    });

    await expect(
      listMyServiceRequests()
    ).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
    });
  });

  it("handles service request query failures", async () => {
    mocks.requestsOrder.mockResolvedValue({
      data: null,
      error: { code: "500", message: "Database unavailable" },
    });

    await expect(
      listMyServiceRequests()
    ).rejects.toMatchObject({
      code: "DATABASE_ERROR",
    });
  });
});