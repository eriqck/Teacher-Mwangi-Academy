import { levels } from "@/lib/catalog";
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
};

function getListValue(values: string[], index: number, fallback: string) {
  if (values.length === 0) {
    return fallback;
  }

  return values[index % values.length];
}

function chunkResources(resources: string[], index: number) {
  if (resources.length === 0) {
    return ["Learner's book", "Teacher's guide", "Charts", "Exercise book"];
  }

  const first = resources[index % resources.length];
  const second = resources[(index + 1) % resources.length];
  return first === second ? [first] : [first, second];
}

function buildLearningOutcome(subStrand: string, outcome: string, index: number) {
  const action = index % 3 === 0 ? "Explain" : index % 3 === 1 ? "Identify" : "Apply";

  return [
    "By the end of the lesson, the learner should be able to:",
    `${action} ${subStrand.toLowerCase()} using relevant examples.`,
    outcome,
    `Appreciate the importance of ${subStrand.toLowerCase()} in day-to-day learning.`
  ].join("\n");
}

function buildLearningExperiences(input: {
  strand: string;
  subStrand: string;
  inquiry: string;
  competency: string;
  value: string;
  issue: string;
}) {
  return [
    `In pairs, learners are guided to discuss the meaning and main ideas in ${input.subStrand}.`,
    `In groups, learners are guided to work through examples and activities from ${input.strand}.`,
    `Learners answer and discuss: ${input.inquiry}`,
    `Learners demonstrate ${input.competency.toLowerCase()} while practising ${input.value.toLowerCase()} and relating the lesson to ${input.issue.toLowerCase()}.`
  ];
}

export function normalizeLineList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildGeneratedScheme(input: SchemeGenerationInput & {
  id: string;
  userId: string;
  createdAt: string;
}): GeneratedSchemeRecord {
  const level = levels.find((entry) => entry.id === input.level);
  const title = `${level?.title ?? input.level} ${input.subject} ${input.term.replace("-", " ").toUpperCase()} Scheme of Work`;
  const strands = normalizeLineList(input.strand);
  const subStrands = normalizeLineList(input.subStrand);

  const weeklyPlan: GeneratedSchemeWeekRecord[] = Array.from(
    { length: input.weeksCount * input.lessonsPerWeek },
    (_, index) => {
      const weekNumber = Math.floor(index / input.lessonsPerWeek) + 1;
      const lessonNumber = index % input.lessonsPerWeek + 1;
      const strand = getListValue(strands, index, input.strand);
      const subStrand = getListValue(subStrands, index, input.subStrand);
      const outcome = getListValue(
        input.learningOutcomes,
        index,
        `Build practical understanding of ${subStrand}.`
      );
      const inquiry = getListValue(
        input.keyInquiryQuestions,
        index,
        `How can learners apply ${subStrand} in real situations?`
      );
      const competency = getListValue(
        input.coreCompetencies,
        index,
        "Critical thinking and problem solving"
      );
      const value = getListValue(input.values, index, "Responsibility");
      const issue = getListValue(
        input.pertinentIssues,
        index,
        "Effective communication and collaboration"
      );
      const assessment = getListValue(
        input.assessmentMethods,
        index,
        "Observation, oral questions, and short written task"
      );

      return {
        weekNumber,
        lessonRange: `${lessonNumber}`,
        focus: `${strand}::${subStrand}`,
        learningOutcome: buildLearningOutcome(subStrand, outcome, index),
        learnerActivities: buildLearningExperiences({
          strand,
          subStrand,
          inquiry,
          competency,
          value,
          issue
        }),
        resources: chunkResources(input.resources, index),
        assessment,
        remarks: input.notes || "Adjust pacing based on learner progress."
      };
    }
  );

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
    resources: input.resources,
    assessmentMethods: input.assessmentMethods,
    notes: input.notes,
    weeklyPlan,
    createdAt: input.createdAt,
    updatedAt: input.createdAt
  };
}
