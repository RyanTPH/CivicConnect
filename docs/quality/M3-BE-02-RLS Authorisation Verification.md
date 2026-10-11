# CivicConnect - Ticket #103: RLS Authorisation Verification

**Issue:** [#103 - RBAC and PostgreSQL RLS Authorisation](https://github.com/RyanTPH/CivicConnect/issues/103)\
**Date:** 11 October 2026\
**Branch:** `feature/M3-BE-02-rls-authorisation`\
**Code:** `supabase/migrations/20261011051521_m3_be_02_rls_authorisation.sql`\
**Status:** Locally implemented and tested; Git commit and pull request still pending.

## 1. What is this document for?

This document explains **what I implemented for Ticket #103, how I checked that it works, and which features are not included**. The SQL migration is the actual code. The screenshots are the visual proof of the tests. This document helps my teammates and lecturer understand both.

**Authorisation means deciding who is allowed to see or change data.** CivicConnect uses Supabase Authentication to identify a signed-in user and PostgreSQL Row Level Security (RLS) to restrict which database records that user can access. Hiding a button on the website is not enough: the database must enforce the rule too.

**Example:** Requester A submitted `RLS-TEST-A`. Requester B submitted `RLS-TEST-B`. Requester A should only see A, even if they try to retrieve B directly. Staff A should only see A because it is assigned to them. A manager or administrator may see both requests.

**Two terms used below:**
- **RLS policy:** a database rule deciding **which rows** a user can access.
- **Database permission (GRANT):** decides whether a user can attempt an operation such as reading, inserting or updating. An operation normally needs both the permission and an applicable RLS policy.

## 2. What I implemented

1. **Protected 12 public database tables with RLS.** This includes service requests, staff/requester profiles, contacts, comments, status history, assignments, and supporting workflow/notification/audit tables.
2. **Limited request visibility by user role.** Requesters see their own requests; ordinary staff see requests assigned to them; active managers and administrators can read all requests.
3. **Restricted request creation.** A signed-in requester may create a request only under their own requester profile. They cannot initially assign it to staff or choose restricted system-controlled fields.
4. **Protected related information.** A user can see request history and non-internal comments only for requests they are allowed to view. Internal comments require an authorised staff profile. Requester contact information is visible only to its requester.
5. **Blocked unapproved direct changes.** Users do not have general direct write access to assignment/history/comment/contact tables. A staff-only row rule for updating assigned requests exists, but direct UPDATE permission is **not** granted permanently; valid status changes and history recording belong to the later workflow ticket.
6. **Kept other sensitive tables closed by default.** `status_transitions`, `channel_messages`, `attachments`, `notifications`, and `audit_log` have RLS enabled and no direct application access under this baseline. That protects the data; it does not mean their features are implemented.

### Current access rules

| User role | Can view | Can change directly in the tested baseline |
|---|---|---|
| Requester | Own requests, own contact information, public comments and status history for own requests | May create a request for themself; cannot change assignment or status directly |
| Ordinary staff | Requests assigned to them; related public/internal comments, status history and assignment history | No permanent direct UPDATE permission; staff workflow not implemented here |
| Supervisor | Requests personally assigned to them | Team-wide privileges not available because there is no team-membership relationship |
| Manager | All service requests and related allowed request information | No unrestricted direct writes; management reporting is separate work |
| Administrator | All service requests and related allowed request information | No unrestricted direct writes; user management and assignment operations are separate work |
| Anonymous | No direct read access to the 12 protected public tables | No direct access granted by this migration |

**Note:** Staff, manager and administrator roles are not given access to private requester-contact records by the current contact policy. â€œRelated informationâ€ in this table does not include those records.

## 3. How I tested it in Supabase

I used **local Supabase Studio**, not a hosted/production database. I created two example requests and five test accounts: two requesters, one staff member, one manager and one administrator. In SQL, I simulated each signed-in account to check which records the database allowed it to see.

| Test | What was checked | Result |
|---|---|---|
| Service-request visibility | Requester A sees A, Requester B sees B, Staff A sees assigned A, Manager/Admin see A and B | **5/5 PASS** |
| Related-data visibility | For each role, the expected comments, status history, assignments and requester contacts were returned | **5/5 PASS** |
| Direct-write permissions | No direct INSERT permissions for protected comments/history/assignments/contacts and no direct UPDATE permission for requests | **1/1 PASS** |
| Database configuration | All 12 public tables have RLS enabled | **12/12** |
| Anonymous table read permissions | None of the 12 public tables allowed direct anonymous SELECT | **0/12 granted** |
| Clean migration setup | The RLS migration ran after eight proposed schema migrations in an isolated sandbox | **PASS, with upstream audit workaround (Section 4)** |

The final related-data and direct-write script produced **6/6 PASS** in one results table. That is five user accounts plus one direct-write permission test.

### Original Supabase Studio screenshots

The screenshots below are **real Supabase Studio results**, not recreated tables.

**Screenshot 1 - Service-request visibility (5/5 PASS).**\
![Supabase Studio showing 5 PASS results for request visibility](../evidence/M3-BE-02/screenshots/03_Service_request_visibility_5_PASS_supabase.png)

**Screenshot 2 - Protected information and write restrictions (6/6 PASS).**\
![Supabase Studio showing 6 PASS results for comments, status history, assignments, contacts and direct-write checks](../evidence/M3-BE-02/screenshots/04_Comments_history_assignments_contacts_6_PASS_supabase.png)

Other original screenshots showing anonymous read rejection, incorrect-owner INSERT rejection, and earlier UPDATE restriction tests are in `evidence/M3-BE-02/screenshots/`. The complete six-row final result is saved in `evidence/M3-BE-02/final-access-results.csv`.

**Important:** These are *database authorisation* tests. The SQL Editor simulated signed-in users; the tests were not end-to-end website login tests. The direct-write test checks database permissions; it does not test future backend functions.

## 4. Problems found and what is not included

These limitations are recorded so the work is clear to reviewers. **Recording them does not mean I am promising to reopen Ticket #103.**

| Item | Explanation / impact |
|---|---|
| Supervisor teams | The schema does not have a team ID, supervisor ID or staff-team relationship. Supervisors therefore only have access to their personally assigned requests. Team-wide access cannot be safely implemented from the current schema. |
| Staff assignment/acceptance | Actual assign/reassign/accept operations are part of [Ticket #106](https://github.com/RyanTPH/CivicConnect/issues/106). #103 restricts direct access; it does not implement those features. |
| Status changes and history | The approved list of valid status changes has not been supplied. The transition function and automatic history recording belong to [Ticket #107](https://github.com/RyanTPH/CivicConnect/issues/107). Therefore ordinary users cannot directly update request statuses yet. |
| Admin user management and manager reporting | These are intended responsibilities, but the actual operations and reporting pages are not delivered or tested by #103. |
| Audit migration error | Proposed migration `007_audit_log.sql` calls `public.audit_row()`, which is missing. The original full reset failed. To test #103 in isolation, 12 broken trigger statements were temporarily disabled **only in the sandbox copy**. The original proposed migration remains unchanged and needs attention from its owner. Audit functionality was not tested. |
| Schema dependency | The #103 migration relies on tables from pending [PR #112](https://github.com/RyanTPH/CivicConnect/pull/112). It must run after those tables exist. Passing in the isolated sandbox does not prove the unchanged shared migrations will deploy successfully. |

## 5. Conclusion and submission status

The tests support that **the RLS restrictions described above work in the local database**, including request ownership, assigned-staff visibility, manager/admin read access, and protected related data. This does not mean the full CivicConnect application, privileged backend functions, or unmodified PR #112 migrations are complete.

**Ready for final Git review:** Check which files are staged, then commit the migration and actual Supabase screenshot evidence, and open a pull request from `feature/M3-BE-02-rls-authorisation` into `staging`. This work has not yet been committed or merged.
