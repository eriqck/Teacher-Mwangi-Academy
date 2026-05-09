import { levels } from "@/lib/catalog";
import {
  pickAssessmentSnippets,
  pickNoteSnippetsForSubStrand,
  pickResourceSnippets,
  pickSchemeSnippetsForSubStrand,
  type SchemeNoteContext
} from "@/lib/scheme-note-context";
import type { GeneratedSchemeRecord, GeneratedSchemeWeekRecord, SchemeTerm } from "@/lib/store";

export type SchemeGenerationInput = {
  level: string;
  subject: string;
  term: SchemeTerm;
  schoolName: string;
  className: string;
  strand: string;
  subStrand: string;
  weeksCount: number;
  lessonsPerWeek: number;
  learningOutcomes: string[];
  keyInquiryQuestions: string[];
  coreCompetencies: string[];
  values: string[];
  pertinentIssues: string[];
  resources: string[];
  assessmentMethods: string[];
  notes: string;
  sourceNoteContext?: SchemeNoteContext;
};

export type SchemeFormatStyle = "rationalized" | "mentor";

type SchemePlanningNotes = {
  academicYear: string;
  referenceBook: string;
  startWeek: number;
  startLesson: number;
  endWeek: number | null;
  endLesson: number | null;
  doubleLesson: string;
  breakSummary: string;
  formatStyle: SchemeFormatStyle;
};

const fallbackResources = ["Learner's Book", "Teacher's Notes", "Exercise Book"];

const subjectResourceDefaults: Array<{
  match: (subject: string) => boolean;
  values: string[];
}> = [
  {
    match: (subject) => subject.includes("religious") || subject.includes("cre"),
    values: ["Bible", "Teacher's Notes", "Digital devices", "Internet"]
  },
  {
    match: (subject) => subject.includes("agriculture") || subject.includes("nutrition"),
    values: ["Digital devices", "Gardening tools", "Demonstration materials", "Learner's notebook"]
  },
  {
    match: (subject) => subject.includes("integrated science"),
    values: ["Basic laboratory apparatus", "Selected specimens", "Digital devices", "Course book"]
  },
  {
    match: (subject) =>
      subject.includes("math") || subject.includes("physics") || subject.includes("chemistry") || subject.includes("biology"),
    values: ["Course book", "Teacher's notes", "Charts", "Digital devices"]
  },
  {
    match: (subject) => subject.includes("english") || subject.includes("kiswahili"),
    values: ["Course book", "Teacher's notes", "Flash cards", "Digital devices"]
  }
];

const subjectAssessmentDefaults: Array<{
  match: (subject: string) => boolean;
  values: string[];
}> = [
  {
    match: (subject) => subject.includes("integrated science"),
    values: ["Written Test", "Assessment Rubrics", "Checklist", "Oral Questions and Answers"]
  },
  {
    match: (subject) => subject.includes("agriculture") || subject.includes("nutrition"),
    values: ["Discussions", "Demonstrations", "Projects", "Written Assessments", "Observation"]
  },
  {
    match: (subject) => subject.includes("religious") || subject.includes("cre"),
    values: ["Assessment Rubrics", "Oral Questions", "Written Tests", "Checklists"]
  }
];

const inquiryVerbs = ["How can", "Why should", "What happens when", "Which factors help learners to"];

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getListValue(values: string[], index: number, fallback: string) {
  if (values.length === 0) {
    return fallback;
  }

  return values[index % values.length];
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getSchemeNoteValue(notes: string, label: string) {
  const line = notes
    .split(/\r?\n/)
    .find((entry) => entry.toLowerCase().startsWith(`${label.toLowerCase()}:`));

  return line?.split(":").slice(1).join(":").trim() || "";
}

function normalizeSentence(value: string, fallback: string) {
  const trimmed = value.trim() || fallback;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function getSubjectDefaults(subject: string, source: Array<{ match: (subject: string) => boolean; values: string[] }>, fallback: string[]) {
  const normalized = subject.trim().toLowerCase();
  return source.find((entry) => entry.match(normalized))?.values ?? fallback;
}

function getActionVerbs(subject: string) {
  const normalized = subject.toLowerCase();

  if (normalized.includes("religious") || normalized.includes("cre")) {
    return ["Explain", "Describe", "Discuss", "Appreciate"];
  }

  if (normalized.includes("agriculture") || normalized.includes("nutrition") || normalized.includes("science")) {
    return ["Explain", "Demonstrate", "Discuss", "Appreciate"];
  }

  return ["Explain", "Identify", "Discuss", "Appreciate"];
}

export function normalizeLineList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseSchemePlanningNotes(
  notes: string,
  fallbackYear = `${new Date().getFullYear()}`,
  referenceBookHint = "",
  subjectHint = ""
): SchemePlanningNotes {
  const academicYear = getSchemeNoteValue(notes, "Academic year") || fallbackYear;
  const referenceBook = getSchemeNoteValue(notes, "Reference book") || referenceBookHint || "Course book";
  const startMatch = notes.match(/Teaching starts at week\s+(\d+),\s+lesson\s+(\d+)/i);
  const endMatch = notes.match(/Teaching ends at week\s+(\d+),\s+lesson\s+(\d+)/i);
  const doubleLesson = getSchemeNoteValue(notes, "Double lesson") || "No double lesson";
  const breakSummary = getSchemeNoteValue(notes, "Breaks") || "No breaks recorded for this term.";
  const rawStyle = getSchemeNoteValue(notes, "Format style").toLowerCase();
  const combined = `${referenceBook} ${subjectHint}`.toLowerCase();
  const preferredSourceStyle = inputSourceStyle(subjectHint, notes);
  const formatStyle: SchemeFormatStyle =
    rawStyle === "mentor" || rawStyle === "rationalized"
      ? (rawStyle as SchemeFormatStyle)
      : preferredSourceStyle
        ? preferredSourceStyle
      : combined.includes("mentor")
        ? "mentor"
        : "rationalized";

  return {
    academicYear,
    referenceBook,
    startWeek: startMatch ? parseNumber(startMatch[1], 1) : 1,
    startLesson: startMatch ? parseNumber(startMatch[2], 1) : 1,
    endWeek: endMatch ? parseNumber(endMatch[1], 0) : null,
    endLesson: endMatch ? parseNumber(endMatch[2], 0) : null,
    doubleLesson,
    breakSummary,
    formatStyle
  };
}

function inputSourceStyle(subjectHint: string, notes: string): SchemeFormatStyle | null {
  const sourceMarker = getSchemeNoteValue(notes, "Source format style").toLowerCase() || subjectHint.toLowerCase();
  if (sourceMarker.includes("mentor")) {
    return "mentor";
  }
  if (sourceMarker.includes("rational")) {
    return "rationalized";
  }
  return null;
}

export function getSchemeFormatStyle(referenceBook: string, subject: string, notes = "") {
  return parseSchemePlanningNotes(notes, `${new Date().getFullYear()}`, referenceBook, subject).formatStyle;
}

export function getSchemeTableHeaders(style: SchemeFormatStyle) {
  return style === "mentor"
    ? [
        "Week",
        "Lesson",
        "Strand",
        "Sub Strand",
        "Specific Learning Outcomes",
        "Learning Experiences",
        "Key Inquiry Questions",
        "Learning Resources",
        "Assessment Methods",
        "Reflection"
      ]
    : [
        "Wk",
        "LSN",
        "Strand",
        "Sub-strand",
        "Specific Learning Outcomes",
        "Key Inquiry Question(s)",
        "Learning Experiences",
        "Learning Resources",
        "Assessment Methods",
        "Refl"
      ];
}

export function getSchemeDisplayHeading(input: {
  style: SchemeFormatStyle;
  year: string;
  levelTitle: string;
  subject: string;
  termLabel: string;
  referenceBook: string;
}) {
  const subjectLabel = input.subject.toUpperCase();
  const levelLabel = input.levelTitle.toUpperCase();
  const termLabel = input.termLabel.toUpperCase();

  if (input.style === "mentor") {
    const referenceLabel = input.referenceBook.trim() ? ` ${input.referenceBook.trim().toUpperCase()}` : "";
    return `${input.year} ${levelLabel} ${subjectLabel}${referenceLabel} SCHEMES OF WORK - ${termLabel}`;
  }

  return `${input.year} RATIONALIZED ${levelLabel} ${subjectLabel} SCHEMES OF WORK ${termLabel}`;
}

function buildLearningOutcomeText(
  subject: string,
  subStrand: string,
  providedOutcome: string,
  index: number,
  sourceSnippets: string[]
) {
  const verbs = getActionVerbs(subject);
  const subjectPhrase = subStrand.toLowerCase();
  const sourceLine = sourceSnippets[0]
    ? normalizeSentence(sourceSnippets[0], `Discuss ideas drawn from ${subjectPhrase}.`)
    : "";
  const lines = [
    "By the end of the lesson, the learner should be able to:",
    normalizeSentence(`${verbs[index % verbs.length]} ${subjectPhrase}`, `Explain ${subjectPhrase}.`),
    sourceLine ||
      normalizeSentence(
        providedOutcome || `${verbs[(index + 1) % verbs.length]} ideas drawn from ${subjectPhrase}`,
        `Discuss ideas drawn from ${subjectPhrase}.`
      ),
    normalizeSentence(`Appreciate the place of ${subjectPhrase} in day-to-day learning`, `Appreciate ${subjectPhrase}.`)
  ];

  return lines.join("\n");
}

function buildLearningExperiencesText(input: {
  subject: string;
  strand: string;
  subStrand: string;
  inquiry: string;
  competency: string;
  value: string;
  issue: string;
  sourceSnippets: string[];
}) {
  const normalizedSubStrand = input.subStrand.toLowerCase();
  const sourceLine = input.sourceSnippets[1] || input.sourceSnippets[0] || "";

  return [
    "Learners are guided in pairs, groups or individually to:",
    normalizeSentence(`brainstorm ideas related to ${normalizedSubStrand}`, `Brainstorm ideas related to ${normalizedSubStrand}.`),
    normalizeSentence(
      sourceLine || `discuss and record the main ideas from ${normalizedSubStrand}`,
      `Discuss and record the main ideas from ${normalizedSubStrand}.`
    ),
    normalizeSentence(
      `carry out an activity from ${input.strand.toLowerCase()} while responding to ${input.inquiry.toLowerCase()}`,
      `Carry out an activity drawn from ${input.strand.toLowerCase()}.`
    ),
    normalizeSentence(
      `demonstrate ${input.competency.toLowerCase()} while practising ${input.value.toLowerCase()} and linking the lesson to ${input.issue.toLowerCase()}`,
      `Demonstrate ${input.competency.toLowerCase()} while practising ${input.value.toLowerCase()}.`
    )
  ];
}

function buildKeyInquiryQuestion(subject: string, strand: string, subStrand: string, questionHint: string, index: number) {
  if (questionHint.trim()) {
    return normalizeSentence(questionHint.trim(), `How can learners apply ${subStrand.toLowerCase()}?`).replace(/\.$/, "?");
  }

  const starter = inquiryVerbs[index % inquiryVerbs.length];
  const target = index % 2 === 0 ? subStrand.toLowerCase() : strand.toLowerCase();
  const subjectHint = subject.toLowerCase();
  return `${starter} learners apply ${target} in ${subjectHint}?`;
}

function buildResourceList(
  subject: string,
  referenceBook: string,
  inputResources: string[],
  noteTitles: string[],
  sourceResources: string[]
) {
  const defaults = getSubjectDefaults(subject, subjectResourceDefaults, fallbackResources);
  return dedupe([referenceBook, ...noteTitles, ...sourceResources, ...defaults, ...inputResources]).slice(0, 6);
}

function buildAssessmentText(subject: string, inputAssessmentMethods: string[], sourceAssessmentMethods: string[]) {
  const defaults = getSubjectDefaults(subject, subjectAssessmentDefaults, [
    "Observation",
    "Oral Questions",
    "Written Exercises",
    "Checklists"
  ]);

  return dedupe([...sourceAssessmentMethods, ...defaults, ...inputAssessmentMethods]).join("\n");
}

function getPairValue(values: string[], pairIndex: number, fallback: string) {
  if (values.length === 0) {
    return fallback;
  }

  return values[pairIndex] || values[pairIndex % values.length] || fallback;
}

export function buildGeneratedScheme(
  input: SchemeGenerationInput & {
    id: string;
    userId: string;
    createdAt: string;
  }
): GeneratedSchemeRecord {
  const level = levels.find((entry) => entry.id === input.level);
  const title = `${level?.title ?? input.level} ${input.subject} ${input.term.replace("-", " ").toUpperCase()} Scheme of Work`;
  const strands = normalizeLineList(input.strand);
  const subStrands = normalizeLineList(input.subStrand);
  const rowCount = input.weeksCount * input.lessonsPerWeek;
  const fallbackContext = {
    noteTitles: [],
    noteSnippets: [],
    schemeTitles: [],
    schemeSnippets: [],
    preferredFormatStyle: null
  } satisfies SchemeNoteContext;
  const sourceContext = input.sourceNoteContext ?? fallbackContext;
  let planningNotes = parseSchemePlanningNotes(input.notes, `${new Date(input.createdAt).getFullYear()}`, "", input.subject);
  if (!getSchemeNoteValue(input.notes, "Format style") && sourceContext.preferredFormatStyle) {
    planningNotes = {
      ...planningNotes,
      formatStyle: sourceContext.preferredFormatStyle
    };
  }
  const initialSourceResources = pickResourceSnippets(sourceContext, input.subject, input.subStrand || input.subject);
  const initialSourceAssessment = pickAssessmentSnippets(sourceContext, input.subject, input.subStrand || input.subject);
  const resources = buildResourceList(
    input.subject,
    planningNotes.referenceBook,
    input.resources,
    sourceContext.noteTitles,
    initialSourceResources
  );
  const assessmentText = buildAssessmentText(input.subject, input.assessmentMethods, initialSourceAssessment);

  const weeklyPlan: GeneratedSchemeWeekRecord[] = Array.from({ length: rowCount }, (_, index) => {
    const pairIndex = subStrands.length > 0 ? index % subStrands.length : index;
    const strand = getPairValue(strands, pairIndex, input.strand || `${input.subject} coverage`);
    const subStrand = getPairValue(subStrands, pairIndex, input.subStrand || "Selected substrand");
    const outcome = getListValue(
      input.learningOutcomes,
      pairIndex,
      `Explain and apply ${subStrand.toLowerCase()} in relevant learning situations.`
    );
    const inquiry = getListValue(
      input.keyInquiryQuestions,
      pairIndex,
      `How can learners apply ${subStrand.toLowerCase()} in practical situations?`
    );
    const competency = getListValue(
      input.coreCompetencies,
      pairIndex,
      "Critical thinking and problem solving"
    );
    const value = getListValue(input.values, pairIndex, "Responsibility");
    const issue = getListValue(input.pertinentIssues, pairIndex, "Responsible citizenship");
    const matchedSchemeSnippets = pickSchemeSnippetsForSubStrand(sourceContext, input.subject, subStrand);
    const matchedNoteSnippets = pickNoteSnippetsForSubStrand(sourceContext, input.subject, subStrand);
    const matchedSourceSnippets = matchedSchemeSnippets.length > 0 ? matchedSchemeSnippets : matchedNoteSnippets;
    const matchedResources = pickResourceSnippets(sourceContext, input.subject, subStrand);
    const matchedAssessment = pickAssessmentSnippets(sourceContext, input.subject, subStrand);
    const absoluteLessonOffset = planningNotes.startLesson - 1 + index;
    const weekNumber = planningNotes.startWeek + Math.floor(absoluteLessonOffset / input.lessonsPerWeek);
    const lessonNumber = (absoluteLessonOffset % input.lessonsPerWeek) + 1;

    return {
      weekNumber,
      lessonRange: `${lessonNumber}`,
      focus: `${strand}::${subStrand}`,
      learningOutcome: buildLearningOutcomeText(input.subject, subStrand, outcome, index, matchedSourceSnippets),
      learnerActivities: buildLearningExperiencesText({
        subject: input.subject,
        strand,
        subStrand,
        inquiry,
        competency,
        value,
        issue,
        sourceSnippets: matchedSourceSnippets
      }),
      keyInquiryQuestion: buildKeyInquiryQuestion(input.subject, strand, subStrand, inquiry, index),
      resources: matchedResources.length > 0 ? matchedResources : resources,
      assessment: matchedAssessment.length > 0 ? dedupe([...matchedAssessment, assessmentText]).join("\n") : assessmentText,
      remarks: ""
    };
  });

  return {
    id: input.id,
    userId: input.userId,
    title,
    level: input.level,
    stage: level?.stage ?? "Junior School",
    subject: input.subject,
    term: input.term,
    schoolName: input.schoolName,
    className: input.className,
    strand: input.strand,
    subStrand: input.subStrand,
    weeksCount: input.weeksCount,
    lessonsPerWeek: input.lessonsPerWeek,
    learningOutcomes: input.learningOutcomes,
    keyInquiryQuestions: input.keyInquiryQuestions,
    coreCompetencies: input.coreCompetencies,
    values: input.values,
    pertinentIssues: input.pertinentIssues,
    resources,
    assessmentMethods: dedupe(assessmentText.split(/\r?\n/)),
    notes: input.notes,
    weeklyPlan,
    createdAt: input.createdAt,
    updatedAt: input.createdAt
  };
}
