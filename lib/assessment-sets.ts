import type { AssessmentSet } from "@/lib/store";

export const assessmentSets: Array<{ id: AssessmentSet; label: string }> = [
  { id: "set-1", label: "Set 1" },
  { id: "set-2", label: "Set 2" },
  { id: "set-3", label: "Set 3" },
  { id: "set-4", label: "Set 4" },
  { id: "cekena-exams", label: "CEKENA Exams" },
  { id: "kala-exams", label: "KALA EXAMS" }
];

export function isAssessmentSet(value: string): value is AssessmentSet {
  return assessmentSets.some((item) => item.id === value);
}

export function getAssessmentSetLabel(value: AssessmentSet | null | undefined) {
  return assessmentSets.find((item) => item.id === value)?.label ?? "Assessment";
}
