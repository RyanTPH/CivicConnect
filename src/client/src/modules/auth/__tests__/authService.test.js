import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { getUserAccess } from "../service/authService";

import {
  findRequesterByUserId,
  findStaffByUserId,
} from "../repository/supabaseAuthRepository";

// Mock the database repository so tests never query Supabase.
vi.mock("../repository/supabaseAuthRepository", () => ({
  findRequesterByUserId: vi.fn(),
  findStaffByUserId: vi.fn(),
}));

describe("getUserAccess", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("recognises a requester", async () => {
    findRequesterByUserId.mockResolvedValue({
      requester_id: "requester-1",
    });

    findStaffByUserId.mockResolvedValue(null);

    const access = await getUserAccess("user-1");

    expect(access.isRequester).toBe(true);
    expect(access.isStaff).toBe(false);
    expect(access.staffRole).toBeNull();
  });

  it("recognises a manager", async () => {
    findRequesterByUserId.mockResolvedValue(null);

    findStaffByUserId.mockResolvedValue({
      staff_id: "staff-1",
      role: "manager",
    });

    const access = await getUserAccess("user-2");

    expect(access.isRequester).toBe(false);
    expect(access.isStaff).toBe(true);
    expect(access.staffRole).toBe("manager");
  });

  it("does not recognise the retired supervisor role", async () => {
    findRequesterByUserId.mockResolvedValue(null);

    findStaffByUserId.mockResolvedValue({
      staff_id: "staff-2",
      role: "supervisor",
    });

    const access = await getUserAccess("user-3");

    expect(access.isStaff).toBe(false);
    expect(access.staffRole).toBeNull();
  });

  it("supports a user with both identities", async () => {
    findRequesterByUserId.mockResolvedValue({
      requester_id: "requester-2",
    });

    findStaffByUserId.mockResolvedValue({
      staff_id: "staff-3",
      role: "staff",
    });

    const access = await getUserAccess("user-4");

    expect(access.isRequester).toBe(true);
    expect(access.isStaff).toBe(true);
    expect(access.staffRole).toBe("staff");
  });

  it("rejects a failed role lookup", async () => {
    findRequesterByUserId.mockRejectedValue(
      new Error("Database unavailable")
    );

    findStaffByUserId.mockResolvedValue(null);

    await expect(
      getUserAccess("user-5")
    ).rejects.toThrow("Database unavailable");
  });
});