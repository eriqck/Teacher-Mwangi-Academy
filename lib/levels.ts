import { levels } from "@/lib/catalog";

export function getLevelById(levelId: string) {
  return levels.find((level) => level.id === levelId) ?? null;
}

export function getLevelByTitle(title: string) {
  return levels.find((level) => level.title.toLowerCase() === title.toLowerCase()) ?? null;
}
