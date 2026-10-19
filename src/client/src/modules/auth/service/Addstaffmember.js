import { supabase } from '../../../shared/lib/supabaseClient'

export const STAFF_ROLES = [
  {
    value: "staff",
    label: "General Staff",
    hint: "Processes assigned service requests.",
  },
  {
    value: "manager",
    label: "Manager",
    hint: "Oversees staff, assignments and service performance.",
  },
  {
    value: "admin",
    label: "Administrator",
    hint: "Manages staff accounts and platform administration.",
  },
];

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

// Request a new account setup email for existing staff.
export async function resendStaffSetup(email) {
  const { data, error } = await supabase.functions.invoke(
    "add-staff",
    {
      body: {
        action: "resend_setup",
        email: email.trim().toLowerCase(),
      },
    },
  );

  if (error) {
    const response = error.context;
    const body = await response?.json?.().catch(() => null);

    throw new AddStaffError(
      body?.error ?? "Unable to request a setup email.",
      response?.status,
    );
  }

  return data;
}

