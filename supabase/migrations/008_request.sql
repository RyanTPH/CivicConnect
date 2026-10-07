-- 006_request_workflow.sql
-- Business rules that must be atomic, kept in the database:
--   * first history row when a request is created
--   * change_request_status(): status update + history in ONE transaction
--   * assign_request() / unassign_request(): ownership with full history
-- Functions are SECURITY INVOKER so RLS (added later) still applies to the caller.



-- ---------- PROVISIONAL status transitions (confirm with ASM-003) ----------
insert into public.status_transitions (from_status, to_status, allowed_roles) values
  ('Submitted',   'Accepted',    '{staff,supervisor,manager,admin}'),
  ('Submitted',   'Rejected',    '{staff,supervisor,manager,admin}'),
  ('Accepted',    'In Progress', '{staff,supervisor,manager,admin}'),
  ('Accepted',    'Rejected',    '{supervisor,manager,admin}'),
  ('In Progress', 'Resolved',    '{staff,supervisor,manager,admin}'),
  ('Resolved',    'Closed',      '{staff,supervisor,manager,admin}'),
  ('Resolved',    'In Progress', '{supervisor,manager,admin}'),
  ('Rejected',    'Closed',      '{supervisor,manager,admin}');

