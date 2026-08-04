create table if not exists mentorship_registrations (
  id text primary key,
  full_name text not null,
  email text not null,
  phone_number text not null,
  child_class text not null default '',
  session_title text not null,
  session_date text not null,
  meet_link text not null default '',
  confirmation_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mentorship_registrations_email
  on mentorship_registrations(email);

create index if not exists idx_mentorship_registrations_created_at
  on mentorship_registrations(created_at desc);
