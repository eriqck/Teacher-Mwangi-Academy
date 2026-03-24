alter table resources
  add column if not exists section text,
  add column if not exists assessment_set text;

alter table resources
  drop constraint if exists resources_section_check;

alter table resources
  add constraint resources_section_check
  check (section in ('notes', 'assessment') or section is null);

alter table resources
  drop constraint if exists resources_assessment_set_check;

alter table resources
  add constraint resources_assessment_set_check
  check (assessment_set in ('set-1', 'set-2', 'set-3') or assessment_set is null);

update resources
set section = 'notes'
where section is null;
