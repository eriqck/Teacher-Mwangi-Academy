alter table resources
  drop constraint if exists resources_assessment_set_check;

alter table resources
  add constraint resources_assessment_set_check
  check (assessment_set in ('set-1', 'set-2', 'set-3', 'cekena-exams') or assessment_set is null);

alter table resource_purchases
  drop constraint if exists resource_purchases_assessment_set_check;

alter table resource_purchases
  add constraint resource_purchases_assessment_set_check
  check (assessment_set in ('set-1', 'set-2', 'set-3', 'cekena-exams') or assessment_set is null);
