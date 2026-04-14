import type { DataStore, PaymentRecord, UserRecord } from "@/lib/store";

export function getTeacherToolAccess(store: DataStore, user: UserRecord) {
  if (user.role === "admin") {
    return {
      hasAccess: true,
      pendingAccess: false,
      latestToolPayment: null as PaymentRecord | null
    };
  }

  const toolPayments = store.payments
    .filter((payment) => payment.userId === user.id && payment.kind === "tool-access")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  const latestToolPayment = toolPayments[0] ?? null;
  const hasAccess = toolPayments.some((payment) => payment.status === "paid");
  const pendingAccess = !hasAccess && toolPayments.some((payment) => payment.status === "pending");

  return {
    hasAccess,
    pendingAccess,
    latestToolPayment
  };
}
