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

  const learningObjectives = input.subStrands.slice(0, 4).map((item, index) =>
    pick(
      [
        `Identify the key ideas in ${item.toLowerCase()}.`,
        `Explain how ${item.toLowerCase()} is applied in real-life situations.`,
        `Practise activities that demonstrate understanding of ${item.toLowerCase()}.`,
        `Appreciate the value of ${item.toLowerCase()} in day-to-day learning.`
      ],
      index,
      `Develop practical understanding of ${item.toLowerCase()}.`
    )
  );
  const keyQuestions = input.subStrands.slice(0, 3).map((item) => `How can learners apply ${item.toLowerCase()} in daily life?`);
  const learnerActivities = input.subStrands.slice(0, 4).map((item, index) =>
    pick(
      [
        `Introduce ${input.unitTitle.toLowerCase()} by asking learners to share what they already know about ${item.toLowerCase()}.`,
        `Guide learners in pairs or small groups to discuss examples of ${item.toLowerCase()}.`,
        `Let learners complete a short practical or written task on ${item.toLowerCase()}.`,
        `Lead a class reflection where learners present what they have learnt about ${item.toLowerCase()}.`
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
    resources: ["Learner's book", "Teacher's guide", "Charts", "Board work", "Learner exercise book"],
    assessmentMethods: ["Oral questions", "Short written exercise", "Observation", "Exit task"],
    reflection: "Adjust pacing and support based on learner response during the lesson.",
    homework: `Assign a short follow-up activity on ${input.subStrands[0] ?? input.subject}.`,
    createdAt: input.createdAt,
    updatedAt: input.createdAt
  };
}
