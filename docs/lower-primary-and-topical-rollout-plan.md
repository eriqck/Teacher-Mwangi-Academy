# Lower Primary and Topical Content Rollout Plan

## Goal

Expand Teacher Mwangi Academy to support PP1, PP2, Grade 1, Grade 2, Grade 3, Grade 4, and Grade 5 while preserving the existing Grade 6, Grade 7, Grade 8, Grade 9, Grade 10, Form 3, and Form 4 user experience.

The new lower-grade content should support:

- Smaller level cards/icons on the homepage and level selection areas.
- PP1 and PP2 grouped together as one early-years entry.
- Grade 1 to Grade 5 as separate entries.
- Subject-first navigation.
- Strand and substrand organization inside each subject.
- Answer files shown directly under their matching question/content files.
- Teacher Mwangi branded topical or trial content where needed.

## Current Site Structure To Preserve

The current live site already relies on:

- `lib/catalog.ts` for level cards, titles, stage names, subjects, and visible tags.
- `resources.level` as display text such as `Grade 6`, `Grade 9`, or `Form 4`.
- `resources.section` for `notes` versus `assessment`.
- `resources.term` for `term-1`, `term-2`, and `term-3`.
- `resources.assessment_set` for Set 1, Set 2, Set 3, Set 4, CEKENA Exams, and KALA Exams.
- The level page grouping resources by school year, term, notes, and assessment set.
- Admin update/delete controls rendered at the end of each listed material.

Do not change those existing behaviors while adding lower grades.

## Recommended Data Model

Avoid a disruptive database migration at first. Use the existing `resources` table for lower-grade files and add optional metadata only if/when the UI needs deeper filtering.

### Phase 1: No Schema Change

Use existing fields:

- `level`: `PP1 & PP2`, `Grade 1`, `Grade 2`, `Grade 3`, `Grade 4`, `Grade 5`
- `subject`: e.g. `Mathematics`, `English Activities`, `Kiswahili Activities`, `Environmental Activities`
- `section`: `notes` or `assessment`
- `term`: `term-1`, `term-2`, or `term-3`
- `assessment_set`: existing sets when content is assessment-based
- `title`: include strand/substrand information in a readable format
- `description`: include strand and answer-key information
- `file_name`: branded ZIP/PDF/DOCX name

Suggested title format:

`Grade 5 Mathematics - Fractions - Equivalent Fractions.zip`

Suggested description format:

`Topical material for Grade 5 Mathematics. Strand: Numbers. Substrand: Fractions. Includes questions and answers.`

### Phase 2: Optional Metadata Columns

Add only when the UI needs precise strand/substrand filters:

- `strand text null`
- `substrand text null`
- `content_series text null`
- `answer_key_of_resource_id text null`

This should be a later migration, not the first step, because the current resource model can already carry the information in title/description without breaking anything.

## Level Catalog Changes

Add new levels in `lib/catalog.ts` before Grade 6:

- `pp1-pp2`: title `PP1 & PP2`, stage `Early Years`
- `grade-1`: title `Grade 1`, stage `Lower Primary`
- `grade-2`: title `Grade 2`, stage `Lower Primary`
- `grade-3`: title `Grade 3`, stage `Lower Primary`
- `grade-4`: title `Grade 4`, stage `Upper Primary`
- `grade-5`: title `Grade 5`, stage `Upper Primary`

Important: the current `Level.stage` type only allows `Junior School` and `Senior School`. Update that type carefully to include:

- `Early Years`
- `Lower Primary`
- `Upper Primary`
- `Junior School`
- `Senior School`

Then confirm every place using `level.stage` still works.

## Subject Lists

Use age-appropriate subject names. Keep names stable because uploads and filters depend on exact text.

### PP1 & PP2

- Language Activities
- Kiswahili Activities
- Mathematical Activities
- Environmental Activities
- Creative Activities
- Religious Activities

### Grade 1 to Grade 3

- English Activities
- Kiswahili Activities
- Mathematics Activities
- Environmental Activities
- Creative Arts
- Religious Education

### Grade 4 to Grade 5

- English
- Kiswahili
- Mathematics
- Science and Technology
- Agriculture and Nutrition
- Creative Arts
- Social Studies
- Religious Education

## UI Changes

### Homepage

Add lower-grade access without overcrowding the page.

Recommended layout:

- Keep the existing main level cards for current grades.
- Add a compact section titled `More classes`.
- Use smaller cards/icons for `PP1 & PP2`, `Grade 1`, `Grade 2`, `Grade 3`, `Grade 4`, and `Grade 5`.
- Avoid placing all subject chips on those small cards. Show 2-3 short tags only.

### Level Page

Preserve the current page structure:

- Subject coverage card
- Access status card
- Schemes page card where applicable
- Materials grouped by year and term
- Notes group
- Assessments group
- Assessment set groups

For lower grades, add a subject and strand browser inside each level page only after resources exist.

Initial lower-grade layout:

- Year
- Term
- Subject
- Strand
- Substrand
- Material links
- Answer links directly below matching questions

### Strand/Substrand Display

Start with a simple hierarchy:

`Subject > Strand > Substrand > Files`

Example:

`Grade 5 > Mathematics > Numbers > Fractions`

Inside the substrand:

- Questions/topical material
- Answers/marking guide directly below it

Avoid creating a new page per substrand in Phase 1. Use collapsible groups first.

## Upload and Naming Rules

Create upload scripts rather than uploading manually through admin when many files are involved.

### Folder Structure For New Content

Ask content suppliers to prepare folders like this:

```text
Grade 5/
  Mathematics/
    Numbers/
      Fractions/
        Questions.pdf
        Answers.pdf
    Geometry/
      Angles/
        Questions.pdf
        Answers.pdf
```

For PP1 and PP2:

```text
PP1 & PP2/
  Mathematical Activities/
    Numbers/
      Counting/
        Questions.pdf
        Answers.pdf
```

### Generated Upload Bundle Names

Use predictable file names:

- `Grade 5 Mathematics - Numbers - Fractions.zip`
- `Grade 4 Science and Technology - Living Things - Plants.zip`
- `PP1 PP2 Mathematical Activities - Numbers - Counting.zip`

### Resource Titles

Use user-friendly titles:

- `Numbers: Fractions`
- `Living Things: Plants`
- `Counting Numbers`

### Resource Descriptions

Use descriptions to hold searchable detail:

- `Grade 5 Mathematics topical material. Strand: Numbers. Substrand: Fractions. Includes questions and answers.`

## Branding Topical Content

If Mr. Mwangi buys topical content and wants it redesigned:

1. Keep the original file untouched in a private working folder.
2. Create a branded Teacher Mwangi version.
3. Add a strong `TM` or `Teacher Mwangi Academy` logo on the cover/header.
4. Keep the original subject, strand, and substrand names accurate.
5. Place answers immediately after each relevant question section or inside the same ZIP below the question file.
6. Upload only the final branded version.

Do not overwrite original supplier files.

## Access and Payments

Keep lower-grade materials under normal subscription access.

Recommended:

- Parents and teachers with active subscription can access all lower-grade materials.
- Do not add one-time purchase for parent assessment materials.
- Keep admin full access.
- Maintain current locked/download behavior from `LevelResourceItem`.

## Safe Implementation Phases

### Phase 1: Planning and Catalog Only

- Add this plan file.
- Decide final subject names for PP1 to Grade 5.
- Confirm whether `PP1 & PP2` should be one card or two cards. Current recommendation: one card.

### Phase 2: Add Levels To Catalog

- Update `lib/catalog.ts` with lower-grade levels.
- Add stage type values.
- Update homepage compact level cards.
- Verify `/levels/pp1-pp2`, `/levels/grade-1`, `/levels/grade-2`, `/levels/grade-3`, `/levels/grade-4`, and `/levels/grade-5` render even with no files.

### Phase 3: Lower-Grade Resource Browser

- Add collapsible subject/strand/substrand grouping for lower-grade level pages.
- Keep the existing year/term/set grouping for current grades.
- Make the new grouping conditional so Grade 6+ behavior does not change unless intentionally migrated.

### Phase 4: Upload Pipeline

- Build a script that reads the folder structure.
- Extracts level, subject, strand, substrand, question file, and answer file.
- Creates ZIP bundles per substrand.
- Uploads to R2.
- Inserts `resources` rows into Supabase.
- Verifies row counts by level, subject, term, and section.

### Phase 5: Admin Support

- Extend admin upload/edit form to optionally specify strand and substrand.
- If no database columns exist yet, save strand/substrand into title and description.
- If metadata columns are later added, save them directly.

### Phase 6: Testing and Deployment

- Test lower-grade cards on desktop and mobile.
- Test no-materials state for each new level.
- Test a sample Grade 5 Mathematics topical upload.
- Test answer file placement.
- Test admin update/delete.
- Test subscriber download.
- Test locked state for logged-out users.
- Test existing Grade 6, Grade 9, Form 4 pages to confirm no regression.

## Rollback Plan

If anything breaks:

1. Revert catalog additions first to hide the new level cards.
2. Keep uploaded resources in Supabase/R2; they will not appear if no route links point users to them.
3. If a resource row is wrong, admin can delete it from the level page or remove it directly from Supabase.
4. Do not alter existing Grade 6+ resources during lower-grade rollout.

## Risks

- Adding new stage names can break code that assumes only `Junior School` and `Senior School`.
- Lower-grade subject names may vary across suppliers; inconsistent names will create messy filters.
- Answer keys can be separated from question files unless upload naming is strict.
- If too many lower-grade cards are added to the homepage at full size, the homepage will feel overcrowded.
- Strand/substrand metadata in titles is enough for Phase 1 but may become limiting later.

## Decisions Needed Before Coding

- Confirm final level card labels: `PP1 & PP2` versus separate `PP1` and `PP2`.
- Confirm lower-grade subject names exactly.
- Confirm whether topical content should be under `notes`, `assessment`, or a new visible label while still stored as one of the existing sections.
- Confirm whether answers should be inside the same ZIP as questions or uploaded as separate visible links below questions.
- Confirm whether lower-grade schemes/lesson-plan generator support is needed now or later.

## Recommended First Build

Start small:

1. Add `PP1 & PP2`, `Grade 1`, `Grade 2`, `Grade 3`, `Grade 4`, and `Grade 5` to `lib/catalog.ts`.
2. Add compact homepage cards only.
3. Leave the current resource page working as-is.
4. Upload one pilot set: Grade 5 Mathematics with 2-3 substrands.
5. Review with Mr. Mwangi before uploading all lower-grade content.

