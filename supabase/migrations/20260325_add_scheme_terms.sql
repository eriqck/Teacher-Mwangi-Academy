alter table resources
  add column if not exists term text;

alter table resources
  drop constraint if exists resources_term_check;

alter table resources
  add constraint resources_term_check
  check (term in ('term-1', 'term-2', 'term-3') or term is null);

alter table payments
  add column if not exists scheme_term text;

alter table payments
  drop constraint if exists payments_scheme_term_check;

alter table payments
  add constraint payments_scheme_term_check
  check (scheme_term in ('term-1', 'term-2', 'term-3') or scheme_term is null);

alter table scheme_purchases
  add column if not exists term text;

alter table scheme_purchases
  drop constraint if exists scheme_purchases_term_check;

alter table scheme_purchases
  add constraint scheme_purchases_term_check
  check (term in ('term-1', 'term-2', 'term-3') or term is null);
