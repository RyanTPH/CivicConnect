import {createAssignmentService} from './service/assignmentService.js';
import {createTeamService} from './service/teamService.js';
import {createSupabaseWorkflowRepository} from './repository/supabaseWorkRepository.js';

export function createWorkflowModule({
    supabase, repository = createSupabaseWorkflowRepository({supabase})
}){
    return {    
    assignment: createAssignmentService({repository}), 
    team: createTeamService({repository})}
}
export {permissionFor, STAFF_ROLES} from './permission.js';