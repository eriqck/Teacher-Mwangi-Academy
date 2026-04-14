alter table payments
  drop constraint if exists payments_kind_check;

alter table payments
  add constraint payments_kind_check
  check (kind in ('subscription', 'scheme', 'resource', 'tool-access'));
