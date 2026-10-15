import {createAssignmentService} from './service/createAssignmentService.js';
import {createTeamService} from './service/Teamservice.js';
import {createSupabaseWorkflowRepository} from './repository/supabaseWorkRepository.js';

export function createWorkflowModule({
    supabase, repository = createSupabaseWorkflowRepository({supabase})
}){
    return {    
    assignment: createAssignmentService({repository}), 
    team: createTeamService({repository})}
}
export {permissionFor, STAFF_ROLES} from './permission.js';