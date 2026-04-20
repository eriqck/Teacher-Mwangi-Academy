import { getSubjectsForStage, levels } from "@/lib/catalog";
import { getTopicGroupsForScheme } from "@/lib/scheme-curriculum";
import type { ResourceRecord, SchemeTerm } from "@/lib/store";

export type LessonPlanUnit = {
  id: string;
  title: string;
  subStrands: string[];
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function cleanMaterialTopic(value: string, subject: string) {
  return value
    .replace(/\.(pdf|docx?|pptx?|xlsx?)$/i, "")
    .replace(/\bgrade\s*\d+\b/gi, "")
    .replace(/\bform\s*\d+\b/gi, "")
    .replace(/\bterm\s*[123]\b/gi, "")
    .replace(/\bset\s*\d+\b/gi, "")
    .replace(new RegExp(`\\b${subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "")
    .replace(/\b(notes?|assessment|exam|revision|paper|pp1|pp2|ms|marking scheme)\b/gi, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildUploadedMaterialUnit(
  levelId: string,
  subject: string,
  term: SchemeTerm,
  resources: ResourceRecord[] = []
): LessonPlanUnit | null {
  const levelTitle = levels.find((level) => level.id === levelId)?.title ?? levelId;
  const relevantResources = resources.filter((resource) => {
    const sameSubject = resource.subject.toLowerCase() === subject.toLowerCase();
    const sameLevel = resource.level.toLowerCase() === levelTitle.toLowerCase();
    const sameTerm = !resource.term || resource.term === term;
    const usableMaterial = resource.category === "revision-material" && (resource.section ?? "notes") === "notes";
    return sameSubject && sameLevel && sameTerm && usableMaterial;
  });

  const topics = Array.from(
    new Set(
      relevantResources
        .flatMap((resource) => [resource.title, resource.description, resource.fileName])
        .map((item) => cleanMaterialTopic(item, subject))
        .filter((item) => item.length > 3)
    )
  ).slice(0, 10);

  if (topics.length === 0) {
    return null;
  }

  return {
    id: `${slug(levelId)}-${slug(subject)}-${term}-uploaded-notes`,
    title: "Uploaded Notes Focus Areas",
    subStrands: topics
  };
}

export function getLessonPlanLevels() {
  return levels;
}

export function getLessonPlanSubjects(levelId: string) {
  const level = levels.find((entry) => entry.id === levelId);
  return level ? getSubjectsForStage(level.stage) : [];
}

export function getLessonPlanUnits(
  levelId: string,
  subject: string,
  term: SchemeTerm,
  resources: ResourceRecord[] = []
): LessonPlanUnit[] {
  const curriculumUnits = getTopicGroupsForScheme(subject, term).map((topic, index) => ({
    id: `${slug(levelId)}-${slug(subject)}-${term}-${index + 1}`,
    title: topic.title,
    subStrands: topic.subtopics
  }));
  const uploadedMaterialUnit = buildUploadedMaterialUnit(levelId, subject, term, resources);

  return uploadedMaterialUnit ? [...curriculumUnits, uploadedMaterialUnit] : curriculumUnits;
}
