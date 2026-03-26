alter table scheme_purchases
  add column if not exists resource_id text;

update scheme_purchases as purchase
set resource_id = payments.resource_id
from payments
where purchase.payment_id = payments.id
  and purchase.resource_id is null
  and payments.resource_id is not null;

alter table scheme_purchases
  drop constraint if exists scheme_purchases_resource_id_fkey;

alter table scheme_purchases
  add constraint scheme_purchases_resource_id_fkey
  foreign key (resource_id) references resources(id) on delete cascade;

create index if not exists idx_scheme_purchases_resource_id on scheme_purchases(resource_id);
