-- CivicConnect: allow trusted backend services
-- to verify existing staff accounts during onboarding.
--
-- This does not grant access to anon or authenticated.

GRANT SELECT ON TABLE public.staff TO service_role;