import { fromPostgrestError } from '../../../shared/errors.js';

// The only file that knows the database function names and column names for the
// manager screens. Services depend on the shape this returns, not on Supabase.
export function createSupabaseWorkflowRepository({ supabase }) {
  async function rpc(fn, args = {}) {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) throw fromPostgrestError(error);
    return data ?? [];
  }
  const staffName = (r) => ({ staffId: r.staff_id, firstName: r.first_name, lastName: r.last_name, role: r.role, department: r.department });
  const requestRow = (r) => ({
    requestId: r.service_request_id, referenceNumber: r.reference_number, title: r.title, category: r.category,
    priority: r.priority, status: r.status, dueAt: r.due_at, isOverdue: r.is_overdue,
  });
  const historyRow = (r) => ({
    assignmentId: r.assignment_id, requestId: r.service_request_id, referenceNumber: r.reference_number,
    assignedToStaffId: r.assigned_to_staff_id, assignedToName: r.assigned_to_name, assignedAt: r.assigned_at,
    assignedByName: r.assigned_by_name, unassignedAt: r.unassigned_at, unassignedByName: r.unassigned_by_name, reason: r.reason,
  });

  return {
    async getManagerSummary() {
      const [r] = await rpc('manager_summary');
      return r && {
        unassignedRequests: r.unassigned_requests, activeStaff: r.active_staff, inactiveStaff: r.inactive_staff,
        openTasks: r.open_tasks, overdueTasks: r.overdue_tasks,
      };
    },
    async getTeamOverview({ role, department, active }) {
      const rows = await rpc('team_overview', { p_role: role, p_department: department, p_active: active });
      return rows.map((r) => ({ ...staffName(r), isActive: r.is_active, openTasks: r.open_tasks, overdueTasks: r.overdue_tasks }));
    },
    async getAssignableStaff() {
      return (await rpc('assignable_staff')).map((r) => ({ ...staffName(r), openTasks: r.open_tasks }));
    },
    async listRequestsForAssignment({ assignment, category, priority, staffId, limit, offset }) {
      const rows = await rpc('requests_for_assignment', {
        p_assignment: assignment, p_category: category, p_priority: priority, p_staff_id: staffId, p_limit: limit, p_offset: offset,
      });
      return rows.map((r) => ({
        ...requestRow(r), assignedStaffId: r.assigned_staff_id, assignedToName: r.assigned_to_name, createdAt: r.created_at,
      }));
    },
    async assignRequest({ requestId, staffId, reason }) {
      await rpc('assign_request', { p_request_id: requestId, p_staff_id: staffId, p_reason: reason });
    },
    async unassignRequest({ requestId, reason }) {
      await rpc('unassign_request', { p_request_id: requestId, p_reason: reason });
    },
    async getStaffTaskSummary(staffId) {
      const [r] = await rpc('staff_task_summary', { p_staff_id: staffId });
      return r && {
        ...staffName(r), isActive: r.is_active, deletedAt: r.deleted_at,
        assignedOpen: r.assigned_open, inProgress: r.in_progress, overdue: r.overdue, resolved: r.resolved,
      };
    },
    async getStaffTasks(staffId) {
      return (await rpc('staff_tasks', { p_staff_id: staffId })).map((r) => ({ ...requestRow(r), assignedAt: r.assigned_at }));
    },
    async getStaffAssignmentHistory(staffId) {
      return (await rpc('staff_assignment_history', { p_staff_id: staffId })).map(historyRow);
    },
    async getRequestAssignmentHistory(requestId) {
      return (await rpc('request_assignment_history', { p_request_id: requestId })).map(historyRow);
    },
  };
}