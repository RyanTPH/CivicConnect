-- Service requests
create table service_requests (
  id uuid primary key default gen_random_uuid(),

  reference_number text not null unique,

  requester_id uuid not null
    references requesters(id),

  assigned_staff_id uuid
    references staff(id),

  -- Category is stored directly on the request.
  -- Add the final approved category CHECK values once the team confirms them.
  category text not null,

  -- Priority is stored directly on the request.
  -- Add the final approved priority CHECK values once the team confirms them.
  priority text not null,

  title varchar(120) not null,

  description text not null,

  status text not null default 'Submitted',

  created_at timestamptz not null default now(),

  updated_at timestamptz null default null,

  resolved_at timestamptz null default null

  deleted_at TIMESTAMP NULL DEFAULT NULL;

  constraint service_request_title_not_blank
    check (length(trim(title)) > 0),

  constraint service_request_description_not_blank
    check (length(trim(description)) > 0),

  constraint service_request_category_not_blank
    check (length(trim(category)) > 0),

  constraint service_request_priority_not_blank
    check (length(trim(priority)) > 0),

  constraint service_request_status_valid
    check (status in (
      'Submitted',
      'In Progress',
      'Resolved',
      'Closed'
    ))
);
