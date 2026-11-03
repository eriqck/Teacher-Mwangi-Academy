alter table resources
  add column if not exists exam_year integer;

alter table resources
  drop constraint if exists resources_section_check;

alter table resources
  add constraint resources_section_check
  check (section in ('notes', 'assessment', 'kjsea-past-papers') or section is null);

alter table resources
  drop constraint if exists resources_exam_year_check;

alter table resources
  add constraint resources_exam_year_check
  check (exam_year is null or exam_year between 2000 and 2100);

alter table resource_purchases
  drop constraint if exists resource_purchases_section_check;

alter table resource_purchases
  add constraint resource_purchases_section_check
  check (section in ('notes', 'assessment', 'kjsea-past-papers'));
