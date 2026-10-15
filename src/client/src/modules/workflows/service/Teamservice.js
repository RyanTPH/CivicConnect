import { ValidationError } from '../../../shared/errors.js';
import { STAFF_ROLES } from '../permissions.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// UI-06 dashboard, UI-11 team overview, UI-13 staff tasks.
export function createTeamService({ repository }) {
  return {
    getSummary: () => repository.getManagerSummary(),
    getOverview({ role = null, department = null, active = null } = {}) {
      if (role !== null && !STAFF_ROLES.includes(role)) throw new ValidationError('Unknown staff role');
      if (active !== null && typeof active !== 'boolean') throw new ValidationError('Active must be true or false');
      return repository.getTeamOverview({ role, department: department || null, active });
    },
    async getStaffDetail(staffId) {
      if (typeof staffId !== 'string' || !UUID.test(staffId)) throw new ValidationError('Staff member is not a valid id');
      const [summary, tasks, history] = await Promise.all([
        repository.getStaffTaskSummary(staffId),
        repository.getStaffTasks(staffId),
        repository.getStaffAssignmentHistory(staffId),
      ]);
      return { summary, tasks, history };
    },
  };
}
