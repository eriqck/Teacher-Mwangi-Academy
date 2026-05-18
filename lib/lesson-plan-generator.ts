import { levels } from "@/lib/catalog";
import {
  pickAssessmentSnippets,
  pickNoteSnippetsForSubStrand,
  pickResourceSnippets,
  pickSchemeSnippetsForSubStrand,
  type SchemeNoteContext
} from "@/lib/scheme-note-context";
import type { GeneratedLessonPlanRecord } from "@/lib/store";

export type LessonPlanGenerationInput = {
  level: string;
  subject: string;
  unitTitle: string;
  subStrands: string[];
  selectedCount: number;
  sourceNoteContext?: SchemeNoteContext;
};

const fallbackResources = ["Learner's book", "Teacher's notes", "Charts", "Board work", "Exercise book"];
const fallbackAssessment = ["Oral questions", "Short written exercise", "Observation", "Exit task"];
const teacherSelfEvaluationPlaceholder =
  "................................................................................................................................................................................................................................................................";

export type LessonPlanCompetencyBundle = {
  coreCompetencies: string[];
  values: string[];
  pcis: string[];
};

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeSentence(value: string, fallback: string) {
  const trimmed = value.trim() || fallback;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function stripLead(value: string, patterns: RegExp[]) {
  return patterns.reduce((current, pattern) => current.replace(pattern, "").trim(), value.trim());
}

function normalizeOutcome(value: string, fallback: string) {
  const stripped = stripLead(value, [
    /^by the end of the lesson, the learner should be able to:\s*/i,
    /^specific learning outcomes?:\s*/i
  ]);

  return normalizeSentence(stripped, fallback);
}

function normalizeKeyQuestion(value: string, fallback: string) {
  const stripped = stripLead(value, [/^key inquiry question\(s\):\s*/i, /^kiq:\s*/i]);
  return normalizeSentence(stripped, fallback);
}

function normalizeActivityStep(value: string, fallback: string) {
  const stripped = stripLead(value, [
    /^lesson development\s*\(\d+\s*minutes?\):\s*/i,
    /^step\s*\d+\s*:\s*/i,
    /^introduction\s*\(\d+\s*minutes?\):\s*/i,
    /^conclusion\s*\(\d+\s*minutes?\):\s*/i
  ]);

  return normalizeSentence(stripped, fallback);
}

function getSourceSnippets(context: SchemeNoteContext | undefined, subject: string, subStrand: string) {
  if (!context) {
    return [];
  }

  const schemeSnippets = pickSchemeSnippetsForSubStrand(context, subject, subStrand, 4);
  if (schemeSnippets.length > 0) {
    return schemeSnippets;
  }

  return pickNoteSnippetsForSubStrand(context, subject, subStrand, 4);
}

function buildLearningObjectives(subject: string, subStrands: string[], context?: SchemeNoteContext) {
  return subStrands.slice(0, 2).map((item, index) => {
    const sourceSnippets = getSourceSnippets(context, subject, item);
    const sourceLine = sourceSnippets[0];

    if (sourceLine) {
      return normalizeOutcome(sourceLine, `Develop practical understanding of ${item.toLowerCase()}.`);
    }

    const fallbacks = [
      `Explain the key ideas in ${item.toLowerCase()}.`,
      `Apply ${item.toLowerCase()} in guided classroom activities.`
    ];

    return fallbacks[index] ?? `Develop practical understanding of ${item.toLowerCase()}.`;
  });
}

function buildKeyQuestions(subject: string, unitTitle: string, subStrands: string[], context?: SchemeNoteContext) {
  const anchor = subStrands[0] ?? unitTitle;
  const sourceSnippets = getSourceSnippets(context, subject, anchor);
  const questionSnippet = sourceSnippets.find((snippet) => snippet.includes("?"));

  if (questionSnippet) {
    return [normalizeKeyQuestion(questionSnippet, `How can learners apply ${anchor.toLowerCase()} in ${subject.toLowerCase()}?`)];
  }

  return [`How can learners apply ${anchor.toLowerCase()} in ${subject.toLowerCase()}?`];
}

function buildLearnerActivities(subject: string, unitTitle: string, subStrands: string[], context?: SchemeNoteContext) {
  const anchor = subStrands[0] ?? unitTitle;
  const sourceSnippets = getSourceSnippets(context, subject, anchor);
  const sourceSteps = sourceSnippets
    .filter((snippet) => /step|discuss|guide|demonstrate|observe|practice|explain|identify|review|summari[sz]e/i.test(snippet))
    .slice(0, 4);

  const fallbacks = [
    `Introduce ${anchor.toLowerCase()} through a short teacher explanation and activate learners' prior knowledge.`,
    `Guide learners through examples, demonstrations, or guided discussion on ${anchor.toLowerCase()}.`,
    `Organize learners in pairs, groups, or individual practice to work on ${anchor.toLowerCase()}.`,
    `Assess learners through oral or written responses and give immediate feedback on ${anchor.toLowerCase()}.`
  ];

  return Array.from({ length: 4 }, (_, index) =>
    normalizeActivityStep(
      sourceSteps[index] ?? "",
      fallbacks[index] ?? `Engage learners with ${anchor.toLowerCase()} through class activity.`
    )
  );
}

function buildResources(subject: string, subStrands: string[], context?: SchemeNoteContext) {
  if (!context || subStrands.length === 0) {
    return fallbackResources;
  }

  const resourceSnippets = subStrands.flatMap((item) => pickResourceSnippets(context, subject, item, 4));
  return dedupe([...resourceSnippets, ...context.noteTitles, ...context.schemeTitles, ...fallbackResources]).slice(0, 6);
}

function buildAssessmentMethods(subject: string, subStrands: string[], context?: SchemeNoteContext) {
  if (!context || subStrands.length === 0) {
    return fallbackAssessment;
  }

  const assessmentSnippets = subStrands.flatMap((item) => pickAssessmentSnippets(context, subject, item, 4));
  return dedupe([...assessmentSnippets, ...fallbackAssessment]).slice(0, 6);
}

export function getLessonPlanCompetencyBundle(subject: string, anchorTopic: string): LessonPlanCompetencyBundle {
  const normalized = `${subject} ${anchorTopic}`.toLowerCase();

  if (/computer|ict|digital|network/i.test(normalized)) {
    return {
      coreCompetencies: ["Communication and Collaboration", "Critical Thinking and Problem Solving"],
      values: ["Responsibility", "Integrity"],
      pcis: ["Digital Literacy", "System Reliability"]
    };
  }

  if (/chemistry|biology|science|electricity|physics/i.test(normalized)) {
    return {
      coreCompetencies: ["Critical Thinking and Problem Solving", "Learning to Learn"],
      values: ["Responsibility", "Respect"],
      pcis: ["Scientific Inquiry", "Environmental Awareness"]
    };
  }

  if (/math|mathematics|trigonometry|algebra|geometry/i.test(normalized)) {
    return {
      coreCompetencies: ["Critical Thinking and Problem Solving", "Communication and Collaboration"],
      values: ["Integrity", "Responsibility"],
      pcis: ["Analytical Skills", "Numeracy"]
    };
  }

  return {
    coreCompetencies: ["Communication and Collaboration", "Learning to Learn"],
    values: ["Responsibility", "Integrity"],
    pcis: ["Problem Solving", "Citizenship"]
  };
}

export function getLessonPlanIntroduction(subject: string, unitTitle: string, subStrand: string, objective: string) {
  const cleanedObjective = objective.replace(/[.!?]+$/, "").toLowerCase();
  return normalizeSentence(
    `Introduce ${unitTitle.toLowerCase()} by linking prior knowledge to ${subStrand.toLowerCase()} and guiding learners toward ${cleanedObjective}`,
    `Introduce ${unitTitle.toLowerCase()} by linking it to learners' prior knowledge.`
  );
}

export function getLessonPlanConclusion(subject: string, anchorTopic: string, objectives: string[], assessmentMethods: string[]) {
  const objectiveLine = objectives[0]?.replace(/[.!?]+$/, "").toLowerCase() ?? `apply ${anchorTopic.toLowerCase()}`;
  const assessmentLine = assessmentMethods[0]?.replace(/[.!?]+$/, "").toLowerCase() ?? "answer oral questions";

  return normalizeSentence(
    `Review the lesson through ${assessmentLine} and confirm that learners can ${objectiveLine}`,
    `Review the lesson and confirm that learners can apply ${anchorTopic.toLowerCase()}.`
  );
}

export function getLessonPlanExtendedActivity(anchorTopic: string) {
  return normalizeSentence(
    `Learners to complete a short follow-up activity on ${anchorTopic.toLowerCase()}`,
    `Learners to complete a short follow-up activity.`
  );
}

export function buildGeneratedLessonPlan(
  input: LessonPlanGenerationInput & {
    id: string;
    userId: string;
    createdAt: string;
  }
): GeneratedLessonPlanRecord {
  const level = levels.find((entry) => entry.id === input.level);
  const title = `${level?.title ?? input.level} ${input.subject} Lesson Plan`;
  const learningObjectives = buildLearningObjectives(input.subject, input.subStrands, input.sourceNoteContext);
  const keyQuestions = buildKeyQuestions(input.subject, input.unitTitle, input.subStrands, input.sourceNoteContext);
  const learnerActivities = buildLearnerActivities(
    input.subject,
    input.unitTitle,
    input.subStrands,
    input.sourceNoteContext
  );
  const resources = buildResources(input.subject, input.subStrands, input.sourceNoteContext);
  const assessmentMethods = buildAssessmentMethods(input.subject, input.subStrands, input.sourceNoteContext);
  const anchorTopic = input.subStrands[0] ?? input.subject;

  return {
    id: input.id,
    userId: input.userId,
    title,
    level: input.level,
    stage: level?.stage ?? "Junior School",
    subject: input.subject,
    unitTitle: input.unitTitle,
    subStrands: input.subStrands,
    selectedCount: input.selectedCount,
    learningObjectives:
      learningObjectives.length > 0
        ? learningObjectives
        : [`Support learners to build practical understanding in ${input.subject}.`],
    keyQuestions:
      keyQuestions.length > 0
        ? keyQuestions
        : [`How can learners apply concepts from ${input.subject.toLowerCase()} meaningfully?`],
    learnerActivities:
      learnerActivities.length > 0
        ? learnerActivities
        : [`Guide learners through a focused ${input.subject.toLowerCase()} activity.`],
    resources,
    assessmentMethods,
    reflection: teacherSelfEvaluationPlaceholder,
    homework: getLessonPlanExtendedActivity(anchorTopic),
    createdAt: input.createdAt,
    updatedAt: input.createdAt
  };
}
