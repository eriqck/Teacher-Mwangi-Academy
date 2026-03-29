alter table password_reset_tokens
  add column if not exists attempts integer not null default 0;
