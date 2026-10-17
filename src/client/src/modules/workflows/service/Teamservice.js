import { ValidationError } from "../errors.js";
import { STAFF_ROLES } from "../permissions.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// UI-06 dashboard, UI-11 team overview, UI-13 staff tasks.
export function createTeamService({ repository }) {
  return {
    getSummary: () => repository.getManagerSummary(),
    getOverview({ role = null, department = null, active = null } = {}) {
      if (role !== null && !STAFF_ROLES.includes(role))
        throw new ValidationError("Unknown staff role");
      if (active !== null && typeof active !== "boolean")
        throw new ValidationError("Active must be true or false");
      return repository.getTeamOverview({
        role,
        department: department || null,
        active,
      });
    },
    async getStaffDetail(staffId) {
      if (typeof staffId !== "string" || !UUID.test(staffId))
        throw new ValidationError("Staff member is not a valid id");
      const [summary, tasks, history] = await Promise.all([
        repository.getStaffTaskSummary(staffId),
        repository.getStaffTasks(staffId),
        repository.getStaffAssignmentHistory(staffId),
      ]);
      return { summary, tasks, history };
    },
    // Validate filters before calling the management reporting RPC.
    getReport({ startDate = null, endDate = null, category = null } = {}) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;

      if (
        (startDate && !datePattern.test(startDate)) ||
        (endDate && !datePattern.test(endDate))
      ) {
        throw new ValidationError("Invalid report date format.");
      }

      if (startDate && endDate && startDate > endDate) {
        throw new ValidationError(
          "The start date must not be after the end date.",
        );
      }

      return repository.getManagementReport({
        startDate,
        endDate,
        category,
      });
    },
  };
}
