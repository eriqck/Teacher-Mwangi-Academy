import { levels } from "@/lib/catalog";
import type { GeneratedLessonPlanRecord } from "@/lib/store";

export type LessonPlanGenerationInput = {
  level: string;
  subject: string;
  unitTitle: string;
  subStrands: string[];
  selectedCount: number;
};

function pick(values: string[], index: number, fallback: string) {
  return values[index] ?? fallback;
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

  const learningObjectives = input.subStrands.slice(0, 4).map((item) => `Guide learners to understand and apply ${item}.`);
  const keyQuestions = input.subStrands.slice(0, 3).map((item) => `How can learners demonstrate ${item.toLowerCase()} in class and at home?`);
  const learnerActivities = input.subStrands.slice(0, 4).map((item, index) =>
    pick(
      [
        `Introduce ${item} through guided discussion and examples.`,
        `Let learners practise ${item.toLowerCase()} in pairs or small groups.`,
        `Use oral questioning and short written tasks around ${item.toLowerCase()}.`,
        `Wrap up ${item.toLowerCase()} with learner reflection and feedback.`
      ],
      index,
      `Engage learners with ${item.toLowerCase()} through class activity.`
    )
  );

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
    learningObjectives: learningObjectives.length > 0
      ? learningObjectives
      : [`Support learners to build practical understanding in ${input.subject}.`],
    keyQuestions: keyQuestions.length > 0
      ? keyQuestions
      : [`How can learners apply concepts from ${input.subject.toLowerCase()} meaningfully?`],
    learnerActivities: learnerActivities.length > 0
      ? learnerActivities
      : [`Guide learners through a focused ${input.subject.toLowerCase()} activity.`],
    resources: ["Course book", "Teacher guide", "Board work", "Learner exercise book"],
    assessmentMethods: ["Oral questions", "Short written exercise", "Observation", "Exit task"],
    reflection: "Adjust pacing and support based on learner response during the lesson.",
    homework: `Assign a short follow-up activity on ${input.subStrands[0] ?? input.subject}.`,
    createdAt: input.createdAt,
    updatedAt: input.createdAt
  };
}
