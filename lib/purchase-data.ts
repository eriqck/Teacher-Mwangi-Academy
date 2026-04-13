import { readAppData } from "@/lib/repository";
import { schemeTerms } from "@/lib/scheme-terms";

export async function getSelectedSchemeForCheckout(schemeId: string) {
  const store = await readAppData();
  const resource = store.resources.find(
    (entry) => entry.id === schemeId && entry.category === "scheme-of-work"
  );

  if (!resource) {
    return null;
  }

  return {
    id: resource.id,
    title: resource.title,
    level: resource.level,
    subject: resource.subject,
    term: resource.term ?? null
  };
}

export async function getAvailableSchemesForCheckout() {
  const store = await readAppData();

  return store.resources
    .flatMap((resource) =>
      resource.category === "scheme-of-work" &&
      resource.term &&
      schemeTerms.some((term) => term.id === resource.term)
        ? [
            {
              id: resource.id,
              title: resource.title,
              level: resource.level,
              subject: resource.subject,
              term: resource.term
            }
          ]
        : []
    )
    .sort((left, right) => {
      const byLevel = left.level.localeCompare(right.level);
      if (byLevel !== 0) return byLevel;
      const bySubject = left.subject.localeCompare(right.subject);
      if (bySubject !== 0) return bySubject;
      const byTerm = left.term.localeCompare(right.term);
      if (byTerm !== 0) return byTerm;
      return left.title.localeCompare(right.title);
    });
}

export async function getSelectedResourceForCheckout(resourceId: string) {
  const store = await readAppData();
  const resource = store.resources.find(
    (entry) =>
      entry.id === resourceId &&
      entry.category === "revision-material" &&
      entry.audience !== "parent"
  );

  if (!resource) {
    return null;
  }

  return {
    id: resource.id,
    title: resource.title,
    level: resource.level,
    subject: resource.subject,
    section: resource.section ?? "notes",
    assessmentSet: resource.assessmentSet ?? null
  };
}
