import {
  findRequesterByUserId,
  findStaffByUserId,
} from "../repository/supabaseAuthRepository";

// Only currently supported internal roles are recognised.
export const STAFF_ROLES = Object.freeze([
  "staff",
  "manager",
  "admin",
]);

// Resolve database-backed access for an authenticated user.
export async function getUserAccess(userId) {
  if (!userId) {
    throw new Error("A user ID is required.");
  }

  const [requester, staff] = await Promise.all([
    findRequesterByUserId(userId),
    findStaffByUserId(userId),
  ]);

  const recognisedStaff =
    staff && STAFF_ROLES.includes(staff.role)
      ? staff
      : null;

  return {
    requester,
    staff: recognisedStaff,
    isRequester: Boolean(requester),
    isStaff: Boolean(recognisedStaff),
    staffRole: recognisedStaff?.role ?? null,
  };
}