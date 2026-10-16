import { createAssignmentService } from "./service/createAssignmentService.js";
import { createTeamService } from "./service/Teamservice.js";
import { createSupabaseWorkflowRepository } from "./repository/createSupabaseWorkflowRepository.js";

// Compose the existing repository and services for management pages.
export function createWorkflowModule({
  repository = createSupabaseWorkflowRepository(),
} = {}) {
  return {
    assignment: createAssignmentService({ repository }),
    team: createTeamService({ repository }),
  };
}

export {
  permissionsFor,
  STAFF_ROLES,
} from "./permissions.js";