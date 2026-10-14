// What each staff role may do. Used to show or hide navigation and buttons.
// The database enforces the same rules; this only keeps the UI honest.
// Roles: staff, manager, admin. Managers run the team and reports; admins also manage accounts.
export const STAFF_ROLES = ['staff', 'manager', 'admin'];

const MANAGER_UP = new Set(['manager', 'admin']);

export function permissionsFor(role) {
  return {
    processRequests: STAFF_ROLES.includes(role),   // accept, update status, comment
    assignOthers: MANAGER_UP.has(role),            // assign / unassign (UI-12)
    viewTeam: MANAGER_UP.has(role),                // team overview, staff tasks (UI-11, UI-13)
    viewReports: MANAGER_UP.has(role),             // reports (UI-09)
    manageUsers: role === 'admin',                 // staff accounts, roles, configuration
  };
}