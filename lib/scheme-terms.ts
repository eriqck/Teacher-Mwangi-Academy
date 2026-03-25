import type { SchemeTerm } from "@/lib/store";

export const schemeTerms: Array<{ id: SchemeTerm; label: string }> = [
  { id: "term-1", label: "Term 1" },
  { id: "term-2", label: "Term 2" },
  { id: "term-3", label: "Term 3" }
];

export function isSchemeTerm(value: string): value is SchemeTerm {
  return value === "term-1" || value === "term-2" || value === "term-3";
}

export function getSchemeTermLabel(term: SchemeTerm | null | undefined) {
  return schemeTerms.find((item) => item.id === term)?.label ?? "Unassigned term";
}
