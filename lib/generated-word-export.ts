import {
  getLessonPlanCompetencyBundle,
  getLessonPlanConclusion,
  getLessonPlanIntroduction
} from "@/lib/lesson-plan-generator";
import {
  getSchemeDisplayHeading,
  getSchemeFormatStyle,
  getSchemeNoteValue,
  parseSchemeBreakEntries,
  getSchemeTableHeaders
} from "@/lib/scheme-generator";
import { getSchemeTermLabel, schemeTerms } from "@/lib/scheme-terms";
import type {
  GeneratedLessonPlanRecord,
  GeneratedLessonPlanRequestPayload,
  GeneratedSchemeRecord
} from "@/lib/store";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSchemeRowFocus(focus: string, fallbackStrand: string, fallbackSubStrand: string) {
  const [strand, subStrand] = focus.split("::");

  return {
    strand: strand || fallbackStrand,
    subStrand: subStrand || fallbackSubStrand
  };
}

function nl2br(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br/>");
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "........................";
  }

  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Nairobi"
  }).format(date);
}

function formatTerm(value: string | undefined) {
  if (!value) {
    return "Not specified";
  }

  return schemeTerms.find((term) => term.id === value || term.label === value)?.label ?? value;
}

function sanitizeNumber(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function sharedDocumentStyles() {
  return `
    body { font-family: "Times New Roman", serif; color: #111; margin: 28px; font-size: 12pt; }
    h1, h2, h3, h4, h5, p { margin: 0; }
    .doc-stack { display: grid; gap: 16px; }
    .doc-title { text-align: center; }
    .doc-title h3 { font-size: 15pt; line-height: 1.4; text-transform: uppercase; }
    .doc-banner { text-align: center; padding: 10px 14px; border: 1px solid #d0d7de; background: #f5f7f8; }
    .doc-banner p, .doc-banner strong { display: block; }
    .doc-meta-strip { display: flex; flex-wrap: wrap; gap: 12px 20px; justify-content: space-between; }
    .doc-block { display: grid; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid #d0d7de; }
    .doc-block h4, .doc-block h5 { font-weight: 700; }
    .doc-block ol, .doc-block ul { margin: 0; padding-left: 20px; }
    .doc-table-wrap { width: 100%; overflow: visible; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #333; padding: 8px 10px; vertical-align: top; text-align: left; }
    th { background: #eef2f4; font-weight: 700; }
    .doc-stage-list { display: grid; gap: 12px; }
    .doc-step { display: grid; gap: 4px; }
  `;
}

export function getSafeWordFilename(value: string, fallback: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || fallback;
}

export function buildGeneratedSchemeWordHtml(input: {
  scheme: GeneratedSchemeRecord;
  userName: string;
  levelTitle: string;
}) {
  const { scheme, userName, levelTitle } = input;
  const schemeYear =
    getSchemeNoteValue(scheme.notes, "Academic year") || `${new Date(scheme.createdAt).getFullYear()}`;
  const referenceBook = getSchemeNoteValue(scheme.notes, "Reference book") || "Course book / teacher guide";
  const termLabel = getSchemeTermLabel(scheme.term);
  const formatStyle = getSchemeFormatStyle(referenceBook, scheme.subject, scheme.notes);
  const tableHeaders = getSchemeTableHeaders(formatStyle);
  const documentHeading = getSchemeDisplayHeading({
    style: formatStyle,
    year: schemeYear,
    levelTitle,
    subject: scheme.subject,
    termLabel,
    referenceBook
  });
  const breakEntries = parseSchemeBreakEntries(scheme.notes);

  const rows = scheme.weeklyPlan
    .flatMap((week, index) => {
      const rowFocus = getSchemeRowFocus(week.focus, scheme.strand, scheme.subStrand);
      const inquiry =
        week.keyInquiryQuestion ||
        scheme.keyInquiryQuestions[index % Math.max(scheme.keyInquiryQuestions.length, 1)] ||
        `How can learners apply ${rowFocus.subStrand.toLowerCase()}?`;
      const previous = index > 0 ? scheme.weeklyPlan[index - 1] : null;
      const previousFocus = previous ? getSchemeRowFocus(previous.focus, scheme.strand, scheme.subStrand) : null;
      const weekLabel = previous?.weekNumber === week.weekNumber ? "" : `${week.weekNumber}`;
      const strandLabel = previousFocus?.strand === rowFocus.strand ? "" : rowFocus.strand;
      const experiencesText = week.learnerActivities.join("\n");
      const resourcesText = week.resources.join("\n");
      const rowBreaks = breakEntries.filter(
        (entry) => entry.week === week.weekNumber && entry.lesson === Number(week.lessonRange)
      );

      const mainRow = `
        <tr>
          <td>${escapeHtml(weekLabel)}</td>
          <td>${escapeHtml(week.lessonRange)}</td>
          <td>${escapeHtml(strandLabel)}</td>
          <td>${escapeHtml(rowFocus.subStrand)}</td>
          <td>${nl2br(week.learningOutcome)}</td>
          ${
            formatStyle === "mentor"
              ? `<td>${nl2br(experiencesText)}</td><td>${escapeHtml(inquiry)}</td>`
              : `<td>${escapeHtml(inquiry)}</td><td>${nl2br(experiencesText)}</td>`
          }
          <td>${nl2br(resourcesText)}</td>
          <td>${nl2br(week.assessment)}</td>
          <td>${nl2br(week.remarks)}</td>
        </tr>
      `;
      const breakRows = rowBreaks.map(
        (entry) => `
          <tr>
            <td colspan="${tableHeaders.length}" style="text-align:center;font-weight:700;background:#faf7ef;">${escapeHtml(entry.title)}</td>
          </tr>
        `
      );

      return [mainRow, ...breakRows];
    })
    .join("");

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(scheme.title)}</title>
      <style>${sharedDocumentStyles()}</style>
    </head>
    <body>
      <div class="doc-stack">
        <div class="doc-title">
          <h3>${escapeHtml(documentHeading)}</h3>
        </div>
        ${
          formatStyle === "mentor"
            ? `<div class="doc-meta-strip">
                <span><strong>SCHOOL</strong> ${escapeHtml(scheme.schoolName || "____________________")}</span>
                <span><strong>TEACHER'S NAME</strong> ${escapeHtml(userName)}</span>
                <span><strong>YEAR</strong> ${escapeHtml(schemeYear)}</span>
              </div>`
            : `<div class="doc-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>SCHOOL</th>
                      <th>GRADE</th>
                      <th>LEARNING AREA</th>
                      <th>TERM</th>
                      <th>YEAR</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>${escapeHtml(scheme.schoolName || "")}</td>
                      <td>${escapeHtml(scheme.className || levelTitle)}</td>
                      <td>${escapeHtml(scheme.subject)}</td>
                      <td>${escapeHtml(termLabel.replace("Term ", ""))}</td>
                      <td>${escapeHtml(schemeYear)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>`
        }
        <div class="doc-table-wrap">
          <table>
            <thead>
              <tr>${tableHeaders.map((heading) => `<th>${escapeHtml(heading)}</th>`).join("")}</tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </body>
  </html>`;
}

export function buildGeneratedLessonPlanWordHtml(input: {
  lessonPlan: GeneratedLessonPlanRecord;
  metadata?: GeneratedLessonPlanRequestPayload | null;
  userName: string;
  levelTitle: string;
  createdAt: string;
}) {
  const { lessonPlan, metadata, userName, levelTitle, createdAt } = input;
  const subStrand = lessonPlan.subStrands[0] ?? lessonPlan.unitTitle;
  const weekNumber = sanitizeNumber(metadata?.weekNumber, "1");
  const lessonNumber = sanitizeNumber(metadata?.lessonNumber, "1");
  const competencyBundle = getLessonPlanCompetencyBundle(lessonPlan.subject, subStrand);
  const introduction = getLessonPlanIntroduction(
    lessonPlan.subject,
    lessonPlan.unitTitle,
    subStrand,
    lessonPlan.learningObjectives[0] ?? `understand ${subStrand}`
  );
  const conclusion = getLessonPlanConclusion(
    lessonPlan.subject,
    subStrand,
    lessonPlan.learningObjectives,
    lessonPlan.assessmentMethods
  );
  const schoolName = metadata?.schoolName || "........................";
  const roll = metadata?.roll || "........................";
  const lessonTime = metadata?.lessonTime || "........................";
  const lessonDate = metadata?.lessonDate ? formatDate(metadata.lessonDate) : "........................";
  const yearValue = metadata?.year || new Date(createdAt).getFullYear().toString();
  const teacherName = metadata?.teacherName || userName || "........................";
  const tscNumber = metadata?.tscNumber || "........................";
  const planHeading = `${levelTitle.toUpperCase()} ${lessonPlan.subject.toUpperCase()} LESSON PLAN: Week ${weekNumber}, Lesson ${lessonNumber}`;
  const lessonSteps = lessonPlan.learnerActivities.length > 0
    ? lessonPlan.learnerActivities
    : [`Guide learners through ${subStrand.toLowerCase()} using discussion, practice, and feedback.`];

  const cvpiRows = Array.from({
    length: Math.max(
      competencyBundle.coreCompetencies.length,
      competencyBundle.values.length,
      competencyBundle.pcis.length
    )
  })
    .map(
      (_, index) => `
      <tr>
        <td>${escapeHtml(competencyBundle.coreCompetencies[index] ?? "")}</td>
        <td>${escapeHtml(competencyBundle.values[index] ?? "")}</td>
        <td>${escapeHtml(competencyBundle.pcis[index] ?? "")}</td>
      </tr>
    `
    )
    .join("");

  const stepRows = lessonSteps
    .map(
      (item, index) => `
      <div class="doc-step">
        <strong>Step ${index + 1}:</strong>
        <p>${escapeHtml(item)}</p>
      </div>
    `
    )
    .join("");

  const assessmentRows = lessonPlan.assessmentMethods
    .map(
      (item, index) => `
      <div class="doc-step">
        <strong>Method ${index + 1}:</strong>
        <p>${escapeHtml(item)}</p>
      </div>
    `
    )
    .join("");

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(lessonPlan.title)}</title>
      <style>${sharedDocumentStyles()}</style>
    </head>
    <body>
      <div class="doc-stack">
        <div class="doc-title">
          <h3>${escapeHtml(planHeading)}</h3>
        </div>
        <div class="doc-banner">
          <p>${escapeHtml(`${levelTitle} ${lessonPlan.subject}`)}</p>
          <strong>${escapeHtml(`WEEK ${weekNumber}: LESSON ${lessonNumber}`)}</strong>
        </div>
        <div class="doc-table-wrap">
          <table>
            <thead>
              <tr>
                <th>SCHOOL</th>
                <th>LEVEL</th>
                <th>LEARNING AREA</th>
                <th>DATE</th>
                <th>TIME</th>
                <th>ROLL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${escapeHtml(schoolName)}</td>
                <td>${escapeHtml(levelTitle)}</td>
                <td>${escapeHtml(lessonPlan.subject)}</td>
                <td>${escapeHtml(lessonDate)}</td>
                <td>${escapeHtml(lessonTime)}</td>
                <td>${escapeHtml(roll)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="doc-meta-strip">
          <span><strong>Year:</strong> ${escapeHtml(yearValue)}</span>
          <span><strong>Term:</strong> ${escapeHtml(formatTerm(metadata?.term))}</span>
          <span><strong>Teacher's Name:</strong> ${escapeHtml(teacherName)}</span>
          <span><strong>TSC No:</strong> ${escapeHtml(tscNumber)}</span>
        </div>
        <div class="doc-block">
          <h4>Strand</h4>
          <p>${escapeHtml(lessonPlan.unitTitle)}</p>
        </div>
        <div class="doc-block">
          <h4>Sub-Strand</h4>
          <p>${escapeHtml(subStrand)}</p>
        </div>
        <div class="doc-block">
          <h4>Specific Learning Outcomes</h4>
          <p>By the end of the lesson, the learner should be able to:</p>
          <ol>${lessonPlan.learningObjectives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        </div>
        <div class="doc-block">
          <h4>Key Inquiry Question(s)</h4>
          <ol>${lessonPlan.keyQuestions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        </div>
        <div class="doc-block">
          <h4>Core Competencies, Values, and PCIs</h4>
          <div class="doc-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Core Competencies</th>
                  <th>Values</th>
                  <th>PCIs</th>
                </tr>
              </thead>
              <tbody>${cvpiRows}</tbody>
            </table>
          </div>
        </div>
        <div class="doc-block">
          <h4>Learning Resources</h4>
          <p>${escapeHtml(lessonPlan.resources.join(", "))}</p>
        </div>
        <div class="doc-block">
          <h4>Organization of Learning</h4>
          <div class="doc-stage-list">
            <div class="doc-step">
              <h5>Introduction (5 minutes)</h5>
              <p>${escapeHtml(introduction)}</p>
            </div>
            <div class="doc-step">
              <h5>Lesson Development (25 minutes)</h5>
              ${stepRows}
            </div>
            <div class="doc-step">
              <h5>Conclusion (10 minutes)</h5>
              <p>${escapeHtml(conclusion)}</p>
            </div>
          </div>
        </div>
        <div class="doc-block">
          <h4>Assessment Methods</h4>
          <div class="doc-stage-list">${assessmentRows}</div>
        </div>
        <div class="doc-block">
          <h4>Extended Activities</h4>
          <p>${escapeHtml(lessonPlan.homework)}</p>
        </div>
        <div class="doc-block">
          <h4>Teacher Self-Evaluation</h4>
          <p>${escapeHtml(lessonPlan.reflection)}</p>
        </div>
      </div>
    </body>
  </html>`;
}
