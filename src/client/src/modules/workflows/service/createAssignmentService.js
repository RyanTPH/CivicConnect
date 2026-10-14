import { ValidationError } from '../../../shared/errors.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ASSIGNMENT_FILTERS = ['all', 'unassigned', 'assigned'];
const MAX_REASON = 500;

function requireId(value, name) {
  if (typeof value !== 'string' || !UUID.test(value)) throw new ValidationError(`${name} is not a valid id`);
  return value;
}
function cleanReason(reason) {
  if (reason == null) return null;
  const text = String(reason).trim();
  if (text.length > MAX_REASON) throw new ValidationError(`Reason must be ${MAX_REASON} characters or fewer`);
  return text === '' ? null : text;
}

// Business rules for UI-12 (assign / unassign). Authorisation is enforced by the database.
export function createAssignmentService({ repository }) {
  return {
    listRequests({ assignment = 'all', category = null, priority = null, staffId = null, page = 1, pageSize = 50 } = {}) {
      if (!ASSIGNMENT_FILTERS.includes(assignment)) throw new ValidationError('Unknown assignment filter');
      if (staffId !== null) requireId(staffId, 'Staff member');
      if (!Number.isInteger(page) || page < 1) throw new ValidationError('Page must be 1 or more');
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200) throw new ValidationError('Page size must be 1 to 200');
      return repository.listRequestsForAssignment({
        assignment, category, priority, staffId, limit: pageSize, offset: (page - 1) * pageSize,
      });
    },
    getAssignableStaff: () => repository.getAssignableStaff(),
    assign({ requestId, staffId, reason } = {}) {
      return repository.assignRequest({
        requestId: requireId(requestId, 'Request'), staffId: requireId(staffId, 'Staff member'), reason: cleanReason(reason),
      });
    },
    unassign({ requestId, reason } = {}) {
      return repository.unassignRequest({ requestId: requireId(requestId, 'Request'), reason: cleanReason(reason) });
    },
    getRequestHistory: (requestId) => repository.getRequestAssignmentHistory(requireId(requestId, 'Request')),
  };
}