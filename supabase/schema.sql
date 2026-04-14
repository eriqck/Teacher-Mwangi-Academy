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

create table if not exists password_reset_tokens (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts integer not null default 0
);

create table if not exists payments (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  kind text not null check (kind in ('subscription', 'scheme', 'resource', 'tool-access', 'generated-scheme')),
  status text not null check (status in ('pending', 'paid', 'failed')),
  provider text,
  currency text,
  amount integer not null,
  phone_number text not null default '',
  account_reference text not null,
  plan text,
  scheme_subject text,
  scheme_level text,
  scheme_term text check (scheme_term in ('term-1', 'term-2', 'term-3')),
  resource_id text,
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
  resource_id text,
  subject text not null,
  level text not null,
  term text check (term in ('term-1', 'term-2', 'term-3')),
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
  assessment_set text check (assessment_set in ('set-1', 'set-2', 'set-3', 'cekena-exams')),
  term text check (term in ('term-1', 'term-2', 'term-3')),
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

create table if not exists resource_purchases (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  resource_id text not null references resources(id) on delete cascade,
  title text not null,
  level text not null,
  subject text not null,
  section text not null check (section in ('notes', 'assessment')),
  assessment_set text check (assessment_set in ('set-1', 'set-2', 'set-3', 'cekena-exams')),
  amount integer not null,
  status text not null check (status in ('pending', 'paid', 'failed')),
  payment_id text not null references payments(id) on delete cascade,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists generated_schemes (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  title text not null,
  level text not null,
  stage text not null,
  subject text not null,
  term text not null check (term in ('term-1', 'term-2', 'term-3')),
  school_name text not null default '',
  class_name text not null default '',
  strand text not null,
  sub_strand text not null,
  weeks_count integer not null check (weeks_count > 0),
  lessons_per_week integer not null check (lessons_per_week > 0),
  learning_outcomes jsonb not null default '[]'::jsonb,
  key_inquiry_questions jsonb not null default '[]'::jsonb,
  core_competencies jsonb not null default '[]'::jsonb,
  values jsonb not null default '[]'::jsonb,
  pertinent_issues jsonb not null default '[]'::jsonb,
  resources jsonb not null default '[]'::jsonb,
  assessment_methods jsonb not null default '[]'::jsonb,
  notes text not null default '',
  weekly_plan jsonb not null default '[]'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists generated_scheme_requests (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  payment_id text not null references payments(id) on delete cascade,
  status text not null check (status in ('pending', 'paid', 'failed', 'completed')),
  payload jsonb not null default '{}'::jsonb,
  generated_scheme_id text references generated_schemes(id) on delete set null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

alter table resources
  add column if not exists section text,
  add column if not exists assessment_set text,
  add column if not exists term text;

alter table payments
  add column if not exists scheme_term text;

alter table payments
  add column if not exists resource_id text;

alter table payments
  drop constraint if exists payments_kind_check;

alter table payments
  add constraint payments_kind_check
  check (kind in ('subscription', 'scheme', 'resource', 'tool-access', 'generated-scheme'));

alter table scheme_purchases
  add column if not exists term text;

alter table scheme_purchases
  add column if not exists resource_id text;

alter table resources
  drop constraint if exists resources_section_check;

alter table resources
  add constraint resources_section_check
  check (section in ('notes', 'assessment') or section is null);

alter table resources
  drop constraint if exists resources_assessment_set_check;

alter table resources
  add constraint resources_assessment_set_check
  check (assessment_set in ('set-1', 'set-2', 'set-3', 'cekena-exams') or assessment_set is null);

alter table resources
  drop constraint if exists resources_term_check;

alter table resources
  add constraint resources_term_check
  check (term in ('term-1', 'term-2', 'term-3') or term is null);

alter table payments
  drop constraint if exists payments_scheme_term_check;

alter table payments
  add constraint payments_scheme_term_check
  check (scheme_term in ('term-1', 'term-2', 'term-3') or scheme_term is null);

alter table scheme_purchases
  drop constraint if exists scheme_purchases_term_check;

alter table scheme_purchases
  add constraint scheme_purchases_term_check
  check (term in ('term-1', 'term-2', 'term-3') or term is null);

alter table scheme_purchases
  drop constraint if exists scheme_purchases_resource_id_fkey;

alter table scheme_purchases
  add constraint scheme_purchases_resource_id_fkey
  foreign key (resource_id) references resources(id) on delete cascade;

alter table resource_purchases
  drop constraint if exists resource_purchases_assessment_set_check;

alter table resource_purchases
  add constraint resource_purchases_assessment_set_check
  check (assessment_set in ('set-1', 'set-2', 'set-3', 'cekena-exams') or assessment_set is null);

update resources
set section = 'notes'
where section is null;

create index if not exists idx_sessions_user_id on sessions(user_id);
create index if not exists idx_password_reset_tokens_user_id on password_reset_tokens(user_id);

alter table password_reset_tokens
  add column if not exists attempts integer not null default 0;
create index if not exists idx_payments_user_id on payments(user_id);
create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create index if not exists idx_scheme_purchases_user_id on scheme_purchases(user_id);
create index if not exists idx_scheme_purchases_resource_id on scheme_purchases(resource_id);
create index if not exists idx_resource_purchases_user_id on resource_purchases(user_id);
create index if not exists idx_resource_purchases_resource_id on resource_purchases(resource_id);
create index if not exists idx_resources_level on resources(level);
create index if not exists idx_generated_schemes_user_id on generated_schemes(user_id);
create index if not exists idx_generated_scheme_requests_user_id on generated_scheme_requests(user_id);
create index if not exists idx_generated_scheme_requests_payment_id on generated_scheme_requests(payment_id);
