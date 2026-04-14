create table if not exists generated_lesson_plans (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  title text not null,
  level text not null,
  stage text not null,
  subject text not null,
  unit_title text not null,
  sub_strands jsonb not null default '[]'::jsonb,
  selected_count integer not null default 0,
  learning_objectives jsonb not null default '[]'::jsonb,
  key_questions jsonb not null default '[]'::jsonb,
  learner_activities jsonb not null default '[]'::jsonb,
  resources jsonb not null default '[]'::jsonb,
  assessment_methods jsonb not null default '[]'::jsonb,
  reflection text not null default '',
  homework text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists generated_lesson_plan_requests (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  payment_id text not null references payments(id) on delete cascade,
  status text not null check (status in ('pending', 'paid', 'failed', 'completed')),
  payload jsonb not null default '{}'::jsonb,
  generated_lesson_plan_id text references generated_lesson_plans(id) on delete set null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists idx_generated_lesson_plans_user_id on generated_lesson_plans(user_id);
create index if not exists idx_generated_lesson_plan_requests_user_id on generated_lesson_plan_requests(user_id);
create index if not exists idx_generated_lesson_plan_requests_payment_id on generated_lesson_plan_requests(payment_id);

alter table payments
  drop constraint if exists payments_kind_check;

alter table payments
  add constraint payments_kind_check
  check (kind in ('subscription', 'scheme', 'resource', 'tool-access', 'generated-scheme', 'generated-lesson-plan'));
