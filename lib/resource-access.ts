import { getCurrentUser } from "@/lib/auth";
import { subscriptionPlans } from "@/lib/business";
import { readAppData } from "@/lib/repository";
import type { ResourceRecord } from "@/lib/store";
import { getLevelById } from "@/lib/levels";

function getPlanDetails(plan: string | null | undefined) {
  if (!plan) {
    return null;
  }

  return plan in subscriptionPlans
    ? subscriptionPlans[plan as keyof typeof subscriptionPlans]
    : null;
}

export async function getLevelPageData(levelId: string) {
  const level = getLevelById(levelId);

  if (!level) {
    return null;
  }

  try {
    const [store, user] = await Promise.all([readAppData(), getCurrentUser()]);
    const resources = store.resources.filter((resource) => resource.level === level.title);

    const activeSubscription = user
      ? store.subscriptions.find(
          (subscription) => subscription.userId === user.id && subscription.status === "active"
        )
      : null;
    const hasTeacherSubscription = user?.role === "teacher" && activeSubscription?.plan === "teacher-monthly";
    const activeSubscriptionPlan = getPlanDetails(activeSubscription?.plan);
    const hasParentLevelAccess =
      user?.role === "parent" &&
      !!activeSubscription &&
      (activeSubscriptionPlan?.levelAccessMode === "all" ||
        activeSubscription.levelAccess.includes(level.id));

    const hasLevelAccess =
      user?.role === "admin" ||
      !!hasTeacherSubscription ||
      hasParentLevelAccess;

    const visibleResources = resources.map((resource) => ({
      ...resource,
      canOpen: canOpenResource(resource, {
        userRole: user?.role ?? null,
        hasLevelAccess,
        hasPaidResource:
          !!user &&
          store.resourcePurchases.some(
            (purchase) =>
              purchase.userId === user.id &&
              purchase.status === "paid" &&
              purchase.resourceId === resource.id
          ),
        hasPaidScheme:
          !!user &&
          store.schemePurchases.some(
            (purchase) =>
              purchase.userId === user.id &&
              purchase.status === "paid" &&
              (purchase.resourceId
                ? purchase.resourceId === resource.id
                : purchase.level === resource.level &&
                  purchase.subject === resource.subject &&
                  (purchase.term ?? null) === (resource.term ?? null))
          )
      }),
      canPurchase:
        user?.role === "teacher" &&
        resource.category === "revision-material" &&
        resource.audience !== "parent"
    }));

    return {
      level,
      user,
      hasLevelAccess,
      resources: visibleResources,
      dataUnavailable: false
    };
  } catch {
    return {
      level,
      user: null,
      hasLevelAccess: false,
      resources: [],
      dataUnavailable: true
    };
  }
}

function canOpenResource(
  resource: ResourceRecord,
  input: {
    userRole: "parent" | "teacher" | "admin" | null;
    hasLevelAccess: boolean;
    hasPaidResource: boolean;
    hasPaidScheme: boolean;
  }
) {
  if (input.userRole === "admin") {
    return true;
  }

  if (resource.category === "scheme-of-work") {
    return input.userRole === "teacher" && input.hasPaidScheme;
  }

  if (input.userRole === "teacher" && input.hasPaidResource) {
    return true;
  }

  if (!input.hasLevelAccess) {
    return false;
  }

  if (resource.audience === "both") {
    return input.userRole === "parent" || input.userRole === "teacher";
  }

  return resource.audience === input.userRole;
}
