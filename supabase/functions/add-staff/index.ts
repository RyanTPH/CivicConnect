// =============================================================================
// supabase/functions/add-staff/index.ts
//
// WHAT THIS DOES
// An admin submits the "Add a staff member" form. This function:
//   1. checks the caller really is an admin
//   2. validates what they typed
//   3. sends Supabase's invite email (creating the login) if the person is new
//   4. creates the row in the `staff` table
//   5. undoes step 3 if step 4 fails, so nothing is left half-done
//
// WHERE IT RUNS
// On Supabase's servers (Deno), NOT in the browser. That is why it may safely
// use the service role key, which must never appear in your React code.
//
// A NOTE ON THE TYPESCRIPT BITS
// Things like `: string`, `type X = ...` and `as Role` are TypeScript labels.
// They describe data shapes and are removed before the code runs. If you read
// past them, the code is ordinary JavaScript.
//
// SECRETS (set once with: supabase secrets set NAME=value)
//   INVITE_REDIRECT_URL  page the invite link opens, e.g. https://yourapp.co.za/set-password
//                        (must also be listed under Auth > URL Configuration > Redirect URLs)
//   ALLOWED_ORIGIN       optional, your app's address, for CORS
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided
// automatically by Supabase.
//
// Leave "verify_jwt" on (the default): it rejects callers who aren't signed in.
// =============================================================================

// Supabase's JavaScript library, loaded the Deno way (like `import` from npm).
import { createClient } from 'npm:@supabase/supabase-js@2'

// The only roles a new staff member may be given. Must match the staff_role
// enum in your database.
const ROLES = ['staff', 'manager', 'admin'] as const
type Role = (typeof ROLES)[number] // TypeScript label: "one of the four above"

// CORS headers let your React app (a different web address from this function)
// call it from the browser. Browsers refuse the call without them.
const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Small helper: build a JSON reply with a status code (200 ok, 403 forbidden...).
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

// TypeScript label: the shape of the cleaned-up form data.
type Input = {
  email: string
  firstName: string
  lastName: string
  role: Role
  department: string | null
}

// -----------------------------------------------------------------------------
// validate: clean up the raw request and collect any problems.
// Returns { data } when everything is fine, or { errors } keyed by field name.
// The React form shows each error under the matching input.
// -----------------------------------------------------------------------------
function validate(body: any): { data?: Input; errors?: Record<string, string> } {
  const errors: Record<string, string> = {}

  // Trim spaces; lowercase the email so "Sam@X.co.za" and "sam@x.co.za" match.
  const email = String(body?.email ?? '').trim().toLowerCase()
  const firstName = String(body?.firstName ?? '').trim()
  const lastName = String(body?.lastName ?? '').trim()
  const role = String(body?.role ?? '')
  const department = String(body?.department ?? '').trim()

  // A simple "something@something.something" check. The real proof the
  // address works is that the invite email arrives.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    errors.email = 'Enter a valid email address'
  }
  if (!firstName || firstName.length > 100) errors.firstName = 'First name is required (max 100 characters)'
  if (!lastName || lastName.length > 100) errors.lastName = 'Last name is required (max 100 characters)'
  if (!ROLES.includes(role as Role)) errors.role = `Role must be one of: ${ROLES.join(', ')}`
  if (department.length > 100) errors.department = 'Department is too long'

  if (Object.keys(errors).length) return { errors }

  // `department || null`: an empty department is stored as null, not "".
  return { data: { email, firstName, lastName, role: role as Role, department: department || null } }
}

// =============================================================================
// The handler: runs once for every request to this function.
// =============================================================================
Deno.serve(async (req) => {
  // Browsers send an OPTIONS "preflight" check before the real request. Say yes.
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  // Only accept POST (the form submit). Reject anything else.
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // The signed-in admin's session token, sent automatically by
  // supabase.functions.invoke(). No token means nobody is signed in.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Not signed in' }, 401)

  const url = Deno.env.get('SUPABASE_URL')!

  // TWO Supabase clients, on purpose:
  //
  // asCaller  - acts AS THE ADMIN who clicked the button. Database rules and
  //             your audit triggers see the admin's identity, so audit_log
  //             records "admin X added staff Y" rather than "system".
  const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  // asService - the all-powerful service role. Used ONLY for things the admin's
  //             own session isn't allowed to do: sending the invite, looking up
  //             logins by email, deleting a login on rollback, lifting a ban.
  const asService = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // ---------------------------------------------------------------------------
  // STEP 1: AUTHORIZE
  // Ask the database "is the person calling me a current admin?" (the
  // is_current_admin function from the SQL migration). This is the real
  // security check. Hiding the button in React is only a convenience.
  // ---------------------------------------------------------------------------
  const { data: isAdmin, error: adminErr } = await asCaller.rpc('is_current_admin')
  if (adminErr) return json({ error: 'Could not verify your permissions' }, 500)
  if (!isAdmin) return json({ error: 'Only admins can add staff' }, 403)

  // ---------------------------------------------------------------------------
  // STEP 2: VALIDATE
  // ---------------------------------------------------------------------------
  let raw: unknown
  try {
    raw = await req.json() // read the form data sent by React
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  const { data: input, errors } = validate(raw)
  // 422 + a `fields` object lets the form show each message by its input.
  if (!input) return json({ error: 'Validation failed', fields: errors }, 422)

  // ---------------------------------------------------------------------------
  // STEP 3: DOES THIS EMAIL ALREADY HAVE A LOGIN?
  // The same person might already exist in Supabase Auth: a resident who is
  // becoming staff, someone being re-hired, or someone who never accepted an
  // earlier invite. We must not invite them a second time.
  // ---------------------------------------------------------------------------
  const { data: found, error: findErr } = await asService.rpc('find_auth_user_by_email', {
    p_email: input.email,
  })
  if (findErr) return json({ error: 'Could not check existing accounts' }, 500)
  const existing = found?.[0] as
    | { id: string; email_confirmed_at: string | null; banned_until: string | null }
    | undefined // undefined = no login with this email yet

  // Options for the invite email.
  const inviteOptions = {
    // Where the "Accept invite" link sends them (your set-password page).
    redirectTo: Deno.env.get('INVITE_REDIRECT_URL'),
    // Saved on the login so your set-password page can greet them by name.
    // WARNING: users can edit this data themselves, so never use it to decide
    // roles or permissions. Roles live only in the staff table.
    data: { first_name: input.firstName, last_name: input.lastName },
  }

  let userId: string // the login's id; the staff row will point at it
  let createdAuthUser = false // true only if THIS request made the login (needed for rollback)
  let inviteSent = false

  if (existing) {
    // The login exists already, so reuse it.
    userId = existing.id
    // They never confirmed their email, so they never accepted an invite:
    // try to send a fresh one. Best effort: how Supabase handles re-invites
    // can vary, so a failure here doesn't stop the staff row being created.
    if (!existing.email_confirmed_at) {
      const { error } = await asService.auth.admin.inviteUserByEmail(input.email, inviteOptions)
      inviteSent = !error
    }
  } else {
    // -------------------------------------------------------------------------
    // STEP 4: NEW PERSON. Supabase creates the login AND emails the invite.
    // -------------------------------------------------------------------------
    const { data: invited, error: inviteErr } = await asService.auth.admin.inviteUserByEmail(
      input.email,
      inviteOptions,
    )
    if (inviteErr || !invited?.user) {
      const status = (inviteErr as any)?.status
      // Someone registered this email in the moments since our lookup.
      if (status === 422 || (inviteErr as any)?.code === 'email_exists') {
        return json({ error: 'That email is already registered' }, 409)
      }
      // Supabase limits how many emails can be sent per hour.
      if (status === 429) return json({ error: 'Too many invites sent. Try again shortly.' }, 429)
      console.error('invite failed', inviteErr) // visible in the function logs
      return json({ error: 'Could not send the invite email' }, 502)
    }
    userId = invited.user.id
    createdAuthUser = true
    inviteSent = true
  }

  // ---------------------------------------------------------------------------
  // STEP 5: CREATE (OR RE-HIRE) THE STAFF ROW
  // add_staff_member (SQL migration) checks the caller is an admin again, then:
  //   - inserts a new staff row, or
  //   - if a soft-deleted row exists, restores it (clears deleted_at) so the
  //     person's history stays in one place.
  // We call it as the ADMIN (asCaller) so the audit log names them.
  // ---------------------------------------------------------------------------
  const { data: result, error: addErr } = await asCaller.rpc('add_staff_member', {
    p_user_id: userId,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_role: input.role,
    p_department: input.department,
  })

  if (addErr) {
    // ROLLBACK: we created a login in step 4 but the staff row failed, so
    // delete that login. Otherwise an orphan login would block re-trying with
    // the same email. We only delete a login WE just created, never an old one.
    if (createdAuthUser) {
      const { error: delErr } = await asService.auth.admin.deleteUser(userId)
      if (delErr) console.error('rollback failed, orphan auth user', userId, delErr)
    }
    // Translate database error codes into messages the admin can act on.
    if (addErr.code === '23505') return json({ error: 'This person is already a staff member' }, 409)
    if (addErr.code === '42501') return json({ error: 'Only admins can add staff' }, 403)
    console.error('add_staff_member failed', addErr)
    return json({ error: 'Could not create the staff record' }, 500)
  }

  // ---------------------------------------------------------------------------
  // STEP 6: RE-HIRE ONLY. When someone is soft-deleted, their login is banned.
  // Now they're back, so lift that ban or they still couldn't sign in.
  // ---------------------------------------------------------------------------
  if (result?.rehired) {
    const { error: unbanErr } = await asService.auth.admin.updateUserById(userId, {
      ban_duration: 'none', // "none" removes the ban
    })
    if (unbanErr) {
      console.error('unban failed', userId, unbanErr)
      // The staff row is already restored, so don't pretend nothing happened.
      return json(
        {
          error: 'Staff record restored, but the login is still blocked. Remove the ban in the Supabase dashboard.',
          staff_id: result.staff_id,
        },
        500,
      )
    }
  }

  // ---------------------------------------------------------------------------
  // DONE. 201 = "a new login was created", 200 = "existing login reused".
  // ---------------------------------------------------------------------------
  return json(
    {
      staff_id: result.staff_id,
      rehired: result.rehired,
      invite_sent: inviteSent,
      message: inviteSent
        ? 'Invite email sent'
        : 'Staff added. They already have a login, so no invite was needed.',
    },
    createdAuthUser ? 201 : 200,
  )
})