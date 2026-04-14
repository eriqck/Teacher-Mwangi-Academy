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

create index if not exists idx_generated_scheme_requests_user_id on generated_scheme_requests(user_id);
create index if not exists idx_generated_scheme_requests_payment_id on generated_scheme_requests(payment_id);

alter table payments
  drop constraint if exists payments_kind_check;

alter table payments
  add constraint payments_kind_check
  check (kind in ('subscription', 'scheme', 'resource', 'tool-access', 'generated-scheme'));
