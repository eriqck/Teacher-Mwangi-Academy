create extension if not exists pgcrypto;

create table if not exists users (
  id text primary key,
  full_name text not null,
  email text not null unique,
  phone_number text not null,
  role text not null check (role in ('parent', 'teacher', 'admin')),
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token text primary key,
  user_id text not null references users(id) on delete cascade,
  created_at timestamptz not null,
  expires_at timestamptz not null
);

create table if not exists payments (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  kind text not null check (kind in ('subscription', 'scheme')),
  status text not null check (status in ('pending', 'paid', 'failed')),
  provider text,
  currency text,
  amount integer not null,
  phone_number text not null default '',
  account_reference text not null,
  plan text,
  scheme_subject text,
  scheme_level text,
  payment_reference text,
  authorization_url text,
  checkout_request_id text,
  merchant_request_id text,
  mpesa_receipt_number text,
  result_code integer,
  result_desc text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists subscriptions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  plan text not null,
  status text not null check (status in ('pending', 'active', 'expired', 'failed')),
  amount integer not null,
  level_access jsonb not null default '[]'::jsonb,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  payment_id text not null references payments(id) on delete cascade
);

create table if not exists scheme_purchases (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  subject text not null,
  level text not null,
  amount integer not null,
  status text not null check (status in ('pending', 'paid', 'failed')),
  payment_id text not null references payments(id) on delete cascade,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists resources (
  id text primary key,
  title text not null,
  description text not null,
  level text not null,
  subject text not null,
  category text not null check (category in ('revision-material', 'scheme-of-work')),
  section text check (section in ('notes', 'assessment')),
  assessment_set text check (assessment_set in ('set-1', 'set-2', 'set-3')),
  audience text not null check (audience in ('parent', 'teacher', 'both')),
  price integer,
  file_name text not null,
  file_path text not null,
  file_url text not null,
  mime_type text not null,
  uploaded_by_user_id text not null references users(id) on delete cascade,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists idx_sessions_user_id on sessions(user_id);
create index if not exists idx_payments_user_id on payments(user_id);
create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create index if not exists idx_scheme_purchases_user_id on scheme_purchases(user_id);
create index if not exists idx_resources_level on resources(level);
