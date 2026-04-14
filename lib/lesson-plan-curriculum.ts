import { levels } from "@/lib/catalog";
import { getTopicGroupsForScheme } from "@/lib/scheme-curriculum";

export type LessonPlanUnit = {
  id: string;
  title: string;
  subStrands: string[];
};

export function getLessonPlanLevels() {
  return levels;
}

export function getLessonPlanSubjects(levelId: string) {
  return levels.find((level) => level.id === levelId)?.subjects ?? [];
}

export function getLessonPlanUnits(levelId: string, subject: string): LessonPlanUnit[] {
  const termOneTopics = getTopicGroupsForScheme(subject, "term-1");

  if (termOneTopics.length > 0) {
    return termOneTopics.map((topic, index) => ({
      id: `${levelId}-${subject}-${index + 1}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: `UNIT ${index + 1}`,
      subStrands: topic.subtopics
    }));
  }

  return [
    {
      id: `${levelId}-${subject}-unit-1`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: "UNIT 1",
      subStrands: [
        `${subject} introduction`,
        `${subject} practical activity`,
        `${subject} discussion`,
        `${subject} application`
      ]
    }
  ];
}
