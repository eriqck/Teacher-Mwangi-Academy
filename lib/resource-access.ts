import { getCurrentUser } from "@/lib/auth";
import { subscriptionPlans } from "@/lib/business";
import { reconcileExpiredSubscriptionsForUser } from "@/lib/payments";
import {
  listResourcePurchasesForUser,
  listResourcesForLevel,
  listSchemePurchasesForUser,
  listSubscriptionsForUser
} from "@/lib/repository";
import { getCurrentSubscription, isSubscriptionCurrentlyActive } from "@/lib/subscriptions";
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
    const user = await getCurrentUser();

    if (user) {
      await reconcileExpiredSubscriptionsForUser(user.id);
    }

    const [resources, subscriptions, resourcePurchases, schemePurchases] = await Promise.all([
      listResourcesForLevel(level.title),
      user ? listSubscriptionsForUser(user.id) : Promise.resolve([]),
      user ? listResourcePurchasesForUser(user.id) : Promise.resolve([]),
      user ? listSchemePurchasesForUser(user.id) : Promise.resolve([])
    ]);

    const activeSubscription = user
      ? getCurrentSubscription(subscriptions)
      : null;
    const hasTeacherSubscription =
      user?.role === "teacher" &&
      !!activeSubscription &&
      isSubscriptionCurrentlyActive(activeSubscription) &&
      activeSubscription.plan === "teacher-monthly";
    const activeSubscriptionPlan = getPlanDetails(activeSubscription?.plan);
    const hasParentLevelAccess =
      user?.role === "parent" &&
      !!activeSubscription &&
      isSubscriptionCurrentlyActive(activeSubscription) &&
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
          resourcePurchases.some(
            (purchase) =>
              purchase.userId === user.id &&
              purchase.status === "paid" &&
              purchase.resourceId === resource.id
          ),
        hasPaidScheme:
          !!user &&
          schemePurchases.some(
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
      canPurchase: canPurchaseResource(resource, user?.role ?? null)
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

  if ((input.userRole === "teacher" || input.userRole === "parent") && input.hasPaidResource) {
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

function canPurchaseResource(
  resource: ResourceRecord,
  userRole: "parent" | "teacher" | "admin" | null
) {
  if (resource.category !== "revision-material") {
    return false;
  }

  if (userRole === "teacher") {
    return resource.audience !== "parent";
  }

  if (userRole === "parent") {
    return (resource.section ?? "notes") === "notes" && resource.audience !== "teacher";
  }

  return false;
}
