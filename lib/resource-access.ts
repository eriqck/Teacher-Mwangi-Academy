import { getCurrentUser } from "@/lib/auth";
import { readAppData } from "@/lib/repository";
import type { ResourceRecord } from "@/lib/store";
import { getLevelById } from "@/lib/levels";

export async function getLevelPageData(levelId: string) {
  const level = getLevelById(levelId);

  if (!level) {
    return null;
  }

  const store = await readAppData();
  const user = await getCurrentUser();
  const resources = store.resources.filter((resource) => resource.level === level.title);

  const activeSubscription = user
    ? store.subscriptions.find((subscription) => subscription.userId === user.id && subscription.status === "active")
    : null;

  const hasLevelAccess =
    user?.role === "admin" ||
    user?.role === "teacher" ||
    (!!activeSubscription && activeSubscription.levelAccess.includes(level.id));

  const visibleResources = resources.map((resource) => ({
    ...resource,
    canOpen: canOpenResource(resource, {
      userRole: user?.role ?? null,
      hasLevelAccess,
      hasPaidScheme:
        !!user &&
        store.schemePurchases.some(
          (purchase) =>
            purchase.userId === user.id &&
            purchase.status === "paid" &&
            purchase.level === resource.level &&
            purchase.subject === resource.subject
        )
    })
  }));

  return {
    level,
    user,
    hasLevelAccess,
    resources: visibleResources
  };
}

function canOpenResource(
  resource: ResourceRecord,
  input: {
    userRole: "parent" | "teacher" | "admin" | null;
    hasLevelAccess: boolean;
    hasPaidScheme: boolean;
  }
) {
  if (input.userRole === "admin") {
    return true;
  }

  if (resource.category === "scheme-of-work") {
    return input.userRole === "teacher" && input.hasPaidScheme;
  }

  if (!input.hasLevelAccess) {
    return false;
  }

  if (resource.audience === "both") {
    return input.userRole === "parent" || input.userRole === "teacher";
  }

  return resource.audience === input.userRole;
}
