
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveServiceRequest } from "../repository/supabaseRequestRepository";
import { supabase } from "../../../shared/lib/supabaseClient";

// Mock the Supabase functions used by the repository.
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  requesterSelect: vi.fn(),
  requesterEq: vi.fn(),
  requesterSingle: vi.fn(),
  requestInsert: vi.fn(),
  savedSelect: vi.fn(),
  savedSingle: vi.fn(),
  existingSelect: vi.fn(),
  existingEq: vi.fn(),
  existingSingle: vi.fn(),
}));

vi.mock("../../../shared/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    from: vi.fn((table) => {
      if (table === "requesters") {
        return {
          select: mocks.requesterSelect,
        };
      }

      if (table === "service_requests") {
        return {
          insert: mocks.requestInsert,
          select: mocks.existingSelect,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  },
}));

describe("saveServiceRequest", () => {
  const request = {
    referenceNumber: "CC-2026-A1B2C3D4",
    category: "Electricity",
    title: "Broken streetlight",
    description: "The streetlight is not working.",
  };

  const savedRequest = {
    service_request_id: "request-123",
    requester_id: "requester-123",
    reference_number: request.referenceNumber,
    category: request.category,
    title: request.title,
    description: request.description,
    status: "Submitted",
    priority: "Medium",
    source_channel: "web",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Simulate an authenticated requester.
    mocks.getUser.mockResolvedValue({
      data: {
        user: { id: "user-123" },
      },
      error: null,
    });

    // Simulate the requester profile lookup.
    mocks.requesterSelect.mockReturnValue({
      eq: mocks.requesterEq,
    });

    mocks.requesterEq.mockReturnValue({
      single: mocks.requesterSingle,
    });

    mocks.requesterSingle.mockResolvedValue({
      data: {
        requester_id: "requester-123",
      },
      error: null,
    });

    // Simulate inserting a service request.
    mocks.requestInsert.mockReturnValue({
      select: mocks.savedSelect,
    });

    mocks.savedSelect.mockReturnValue({
      single: mocks.savedSingle,
    });

    mocks.savedSingle.mockResolvedValue({
      data: savedRequest,
      error: null,
    });

    // Simulate looking up an existing request.
    mocks.existingSelect.mockReturnValue({
      eq: mocks.existingEq,
    });

    mocks.existingEq.mockReturnValue({
      single: mocks.existingSingle,
    });

    mocks.existingSingle.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST116",
        message: "No rows found",
      },
    });
  });

  // --------------------------------------------------
  // 1. SUCCESSFUL REQUEST PERSISTENCE
  // --------------------------------------------------

  it("saves a valid service request successfully", async () => {
    const result = await saveServiceRequest(request);

    expect(supabase.auth.getUser).toHaveBeenCalled();

    expect(supabase.from).toHaveBeenCalledWith("requesters");

    expect(mocks.requesterSelect).toHaveBeenCalledWith(
      "requester_id"
    );

    expect(mocks.requesterEq).toHaveBeenCalledWith(
      "user_id",
      "user-123"
    );

    expect(supabase.from).toHaveBeenCalledWith(
      "service_requests"
    );

    expect(mocks.requestInsert).toHaveBeenCalledWith({
      reference_number: request.referenceNumber,
      requester_id: "requester-123",
      category: "Electricity",
      title: "Broken streetlight",
      description: "The streetlight is not working.",
    });

    expect(result).toEqual(savedRequest);

    // Priority and status are assigned by PostgreSQL.
    const insertedData = mocks.requestInsert.mock.calls[0][0];

    expect(insertedData).not.toHaveProperty("priority");
    expect(insertedData).not.toHaveProperty("status");

    expect(mocks.existingSelect).not.toHaveBeenCalled();
  });

  // --------------------------------------------------
  // 2. REQUEST VALIDATION
  // --------------------------------------------------

  it("rejects a request with an empty title", async () => {
    await expect(
      saveServiceRequest({
        ...request,
        title: "   ",
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Please complete all required fields.",
    });

    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.requestInsert).not.toHaveBeenCalled();
  });

  it("rejects a request without a reference number", async () => {
    await expect(
      saveServiceRequest({
        ...request,
        referenceNumber: "",
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Please complete all required fields.",
    });

    expect(mocks.requestInsert).not.toHaveBeenCalled();
  });

  // --------------------------------------------------
  // 3. AUTHENTICATION
  // --------------------------------------------------

  it("rejects a request when no user is signed in", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(
      saveServiceRequest(request)
    ).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
      message:
        "A signed-in requester is required to submit a request.",
    });

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects a request when authentication fails", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: {
        message: "Invalid session",
      },
    });

    await expect(
      saveServiceRequest(request)
    ).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
      message:
        "A signed-in requester is required to submit a request.",
    });

    expect(mocks.requestInsert).not.toHaveBeenCalled();
  });

  // --------------------------------------------------
  // 4. REQUESTER PROFILE
  // --------------------------------------------------

  it("rejects a request when the requester profile is missing", async () => {
    mocks.requesterSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(
      saveServiceRequest(request)
    ).rejects.toMatchObject({
      code: "PROFILE_NOT_FOUND",
      message: "The requester profile could not be found.",
    });

    expect(mocks.requestInsert).not.toHaveBeenCalled();
  });

  it("handles a requester profile lookup error", async () => {
    mocks.requesterSingle.mockResolvedValue({
      data: null,
      error: {
        message: "Database lookup failed",
      },
    });

    await expect(
      saveServiceRequest(request)
    ).rejects.toMatchObject({
      code: "PROFILE_NOT_FOUND",
      message: "The requester profile could not be found.",
    });

    expect(mocks.requestInsert).not.toHaveBeenCalled();
  });

  it("rejects unauthorised access to a requester profile", async () => {
    mocks.requesterSingle.mockResolvedValue({
      data: null,
      error: {
        code: "42501",
        message: "Permission denied",
      },
    });

    await expect(
      saveServiceRequest(request)
    ).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
      message:
        "You do not have permission to access this requester profile.",
    });

    expect(mocks.requestInsert).not.toHaveBeenCalled();
  });

  // --------------------------------------------------
  // 5. DATABASE ERRORS
  // --------------------------------------------------

  it("handles a general database error when saving", async () => {
    mocks.savedSingle.mockResolvedValue({
      data: null,
      error: {
        message: "Database unavailable",
      },
    });

    await expect(
      saveServiceRequest(request)
    ).rejects.toMatchObject({
      code: "DATABASE_ERROR",
      message: "The service request could not be saved.",
    });
  });

  it("rejects an INSERT when database permissions are denied", async () => {
    mocks.savedSingle.mockResolvedValue({
      data: null,
      error: {
        code: "42501",
        message: "Permission denied for service_requests",
      },
    });

    await expect(
      saveServiceRequest(request)
    ).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
      message:
        "You do not have permission to submit this request.",
    });
  });

  it("handles invalid data rejected by PostgreSQL", async () => {
    mocks.savedSingle.mockResolvedValue({
      data: null,
      error: {
        code: "23514",
        message: "Check constraint violation",
      },
    });

    await expect(
      saveServiceRequest(request)
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "The request contains invalid information.",
    });
  });

  // --------------------------------------------------
  // 6. DUPLICATE AND RETRY HANDLING
  // --------------------------------------------------

  it("returns the existing request when the same submission is retried", async () => {
    mocks.savedSingle.mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message: "Duplicate reference number",
      },
    });

    mocks.existingSingle.mockResolvedValue({
      data: savedRequest,
      error: null,
    });

    const result = await saveServiceRequest(request);

    expect(mocks.existingSelect).toHaveBeenCalledWith("*");

    expect(mocks.existingEq).toHaveBeenCalledWith(
      "reference_number",
      request.referenceNumber
    );

    expect(result).toEqual(savedRequest);
  });

  it("rejects a duplicate reference with different request details", async () => {
    mocks.savedSingle.mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message: "Duplicate reference number",
      },
    });

    mocks.existingSingle.mockResolvedValue({
      data: {
        ...savedRequest,
        title: "Different service request",
      },
      error: null,
    });

    await expect(
      saveServiceRequest(request)
    ).rejects.toMatchObject({
      code: "REFERENCE_CONFLICT",
      message: "This reference number is already in use.",
    });
  });

  it("rejects a duplicate reference belonging to another requester", async () => {
    mocks.savedSingle.mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message: "Duplicate reference number",
      },
    });

    mocks.existingSingle.mockResolvedValue({
      data: {
        ...savedRequest,
        requester_id: "another-requester",
      },
      error: null,
    });

    await expect(
      saveServiceRequest(request)
    ).rejects.toMatchObject({
      code: "REFERENCE_CONFLICT",
      message: "This reference number is already in use.",
    });
  });

  it("handles a database failure when checking an existing request", async () => {
    mocks.savedSingle.mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message: "Duplicate reference number",
      },
    });

    mocks.existingSingle.mockResolvedValue({
      data: null,
      error: {
        code: "500",
        message: "Database lookup failed",
      },
    });

    await expect(
      saveServiceRequest(request)
    ).rejects.toMatchObject({
      code: "DATABASE_ERROR",
      message: "The existing request could not be checked.",
    });
  });

  it("handles permission denial during duplicate lookup", async () => {
    mocks.savedSingle.mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message: "Duplicate reference number",
      },
    });

    mocks.existingSingle.mockResolvedValue({
      data: null,
      error: {
        code: "42501",
        message: "Permission denied",
      },
    });

    await expect(
      saveServiceRequest(request)
    ).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
      message:
        "You do not have permission to check this request.",
    });
  });

  it("handles an existing reference hidden by RLS", async () => {
    mocks.savedSingle.mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message: "Duplicate reference number",
      },
    });

    mocks.existingSingle.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST116",
        message: "No rows returned",
      },
    });

    await expect(
      saveServiceRequest(request)
    ).rejects.toMatchObject({
      code: "REFERENCE_CONFLICT",
      message: "This reference number is already in use.",
    });
  });
});
