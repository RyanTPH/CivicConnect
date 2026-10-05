
-- Staff
create table staff (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null unique
    references auth.users(id)
    on delete cascade,

  deleted_at TIMESTAMP NULL DEFAULT NULL;
);
