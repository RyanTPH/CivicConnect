import { supabase } from '../../lib/supabaseClient'

// Descriptions come from your schema map (staff.role).
export const STAFF_ROLES = [
  { value: 'staff', label: 'Staff', hint: 'Processes assigned requests.' },
  { value: 'supervisor', label: 'Supervisor', hint: 'Also assigns and reassigns requests.' },
  { value: 'manager', label: 'Manager', hint: 'Also sees dashboards and reports.' },
  { value: 'admin', label: 'Admin', hint: 'Maintains the platform and can change roles.' },
]

export class AddStaffError extends Error {
  constructor(message, status, fields) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

// input: { email, firstName, lastName, role, department }
// returns: { staff_id, rehired, invite_sent, message }
export async function addStaffMember(input) {
  const { data, error } = await supabase.functions.invoke('add-staff', { body: input })

  if (error) {
    // For non-2xx replies, supabase-js puts the raw Response on error.context.
    const res = error.context
    const body = await res?.json?.().catch(() => null)
    throw new AddStaffError(
      body?.error ?? 'Could not reach the server. Check your connection and try again.',
      res?.status,
      body?.fields,
    )
  }
  return data
}