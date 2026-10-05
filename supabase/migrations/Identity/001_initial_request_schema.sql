-- CivicConnect initial PostgreSQL migration for Supabase
-- Final M2-13 schema alignment based on the current ERD decisions.
-- Supabase Auth remains the authentication source.

create extension if not exists pgcrypto;


-- Requesters
create table requesters (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null unique
    references auth.users(id)
    on delete cascade,

    deleted_at TIMESTAMP NULL DEFAULT NULL;
);






