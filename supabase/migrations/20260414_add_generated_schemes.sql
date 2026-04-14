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

create index if not exists idx_generated_schemes_user_id on generated_schemes(user_id);
