alter table payments
  add column if not exists resource_id text;

alter table payments
  drop constraint if exists payments_kind_check;

alter table payments
  add constraint payments_kind_check
  check (kind in ('subscription', 'scheme', 'resource'));

create table if not exists resource_purchases (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  resource_id text not null references resources(id) on delete cascade,
  title text not null,
  level text not null,
  subject text not null,
  section text not null check (section in ('notes', 'assessment')),
  assessment_set text check (assessment_set in ('set-1', 'set-2', 'set-3')),
  amount integer not null,
  status text not null check (status in ('pending', 'paid', 'failed')),
  payment_id text not null references payments(id) on delete cascade,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

alter table resource_purchases
  drop constraint if exists resource_purchases_assessment_set_check;

alter table resource_purchases
  add constraint resource_purchases_assessment_set_check
  check (assessment_set in ('set-1', 'set-2', 'set-3') or assessment_set is null);

create index if not exists idx_resource_purchases_user_id on resource_purchases(user_id);
create index if not exists idx_resource_purchases_resource_id on resource_purchases(resource_id);
