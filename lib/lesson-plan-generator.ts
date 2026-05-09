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

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeSentence(value: string, fallback: string) {
  const trimmed = value.trim() || fallback;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
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
  return subStrands.slice(0, 4).map((item, index) => {
    const sourceSnippets = getSourceSnippets(context, subject, item);
    const sourceLine = sourceSnippets[0];

    if (sourceLine) {
      return normalizeSentence(sourceLine, `Develop practical understanding of ${item.toLowerCase()}.`);
    }

    const fallbacks = [
      `Identify the key ideas in ${item.toLowerCase()}.`,
      `Explain how ${item.toLowerCase()} is applied in real-life situations.`,
      `Practise activities that demonstrate understanding of ${item.toLowerCase()}.`,
      `Appreciate the value of ${item.toLowerCase()} in day-to-day learning.`
    ];

    return fallbacks[index] ?? `Develop practical understanding of ${item.toLowerCase()}.`;
  });
}

function buildKeyQuestions(subject: string, unitTitle: string, subStrands: string[]) {
  return subStrands.slice(0, 3).map((item, index) => {
    const lower = item.toLowerCase();
    if (index === 0) {
      return `How can learners apply ${lower} in ${subject.toLowerCase()}?`;
    }
    if (index === 1) {
      return `Why is ${lower} important in ${unitTitle.toLowerCase()}?`;
    }
    return `What should learners observe when working with ${lower}?`;
  });
}

function buildLearnerActivities(subject: string, unitTitle: string, subStrands: string[], context?: SchemeNoteContext) {
  return subStrands.slice(0, 4).map((item, index) => {
    const sourceSnippets = getSourceSnippets(context, subject, item);
    const sourceLine = sourceSnippets[1] || sourceSnippets[0];

    if (sourceLine) {
      return normalizeSentence(sourceLine, `Guide learners through ${item.toLowerCase()} using discussion and practice.`);
    }

    const fallbacks = [
      `Introduce ${unitTitle.toLowerCase()} by asking learners to share what they already know about ${item.toLowerCase()}.`,
      `Guide learners in pairs or small groups to discuss examples of ${item.toLowerCase()}.`,
      `Let learners complete a short practical or written task on ${item.toLowerCase()}.`,
      `Lead a class reflection where learners present what they have learnt about ${item.toLowerCase()}.`
    ];

    return fallbacks[index] ?? `Engage learners with ${item.toLowerCase()} through class activity.`;
  });
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
  const keyQuestions = buildKeyQuestions(input.subject, input.unitTitle, input.subStrands);
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
    reflection: `Adjust pacing and support based on learner response while teaching ${anchorTopic.toLowerCase()}.`,
    homework: `Assign a short follow-up activity on ${anchorTopic}.`,
    createdAt: input.createdAt,
    updatedAt: input.createdAt
  };
}
