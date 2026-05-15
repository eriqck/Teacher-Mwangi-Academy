import type { SubscriptionRecord } from "@/lib/store";

function getTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function isSubscriptionPastEndDate(
  subscription: Pick<SubscriptionRecord, "endDate">,
  now = Date.now()
) {
  const endTimestamp = getTimestamp(subscription.endDate);
  return endTimestamp !== null && endTimestamp < now;
}

export function getEffectiveSubscriptionStatus(
  subscription: Pick<SubscriptionRecord, "status" | "endDate">,
  now = Date.now()
) {
  if (subscription.status === "active" && isSubscriptionPastEndDate(subscription, now)) {
    return "expired" as const;
  }

  return subscription.status;
}

export function isSubscriptionCurrentlyActive(
  subscription: Pick<SubscriptionRecord, "status" | "endDate">,
  now = Date.now()
) {
  return getEffectiveSubscriptionStatus(subscription, now) === "active";
}

export function getCurrentSubscription(
  subscriptions: SubscriptionRecord[],
  now = Date.now()
) {
  const sorted = subscriptions
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return (
    sorted.find((subscription) => isSubscriptionCurrentlyActive(subscription, now)) ??
    sorted.find((subscription) => getEffectiveSubscriptionStatus(subscription, now) === "pending") ??
    sorted[0] ??
    null
  );
}
