import { createId } from "@/lib/auth";
import { getPaystackCallbackUrl, initializePaystackTransaction, verifyPaystackTransaction } from "@/lib/paystack";
import { schemeOfWorkPrice, subscriptionPlans, teacherMaterialPrice } from "@/lib/business";
import type {
  PaymentRecord,
  ResourcePurchaseRecord,
  ResourceRecord,
  SchemePurchaseRecord,
  SubscriptionPlan,
  SubscriptionRecord
} from "@/lib/store";
import {
  createResourcePaymentBundle,
  createSchemePaymentBundle,
  createSubscriptionPaymentBundle,
  findPaymentByReference,
  markPaymentOutcome,
  readAppData,
  updatePaymentById
} from "@/lib/repository";

function addDays(days: number) {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now.toISOString();
}

export async function createPendingSubscriptionPayment(input: {
  userId: string;
  email: string;
  plan: SubscriptionPlan;
  accountReference: string;
  level: string | null;
}) {
  const plan = subscriptionPlans[input.plan];
  const paymentId = createId("pay");
  const subscriptionId = createId("sub");
  const createdAt = new Date().toISOString();
  const levelAccess = plan.levelAccessMode === "all" ? [] : input.level ? [input.level] : [];

  const payment: PaymentRecord = {
    id: paymentId,
    userId: input.userId,
    kind: "subscription",
    status: "pending",
    provider: "paystack",
    currency: "KES",
    amount: plan.amount,
    phoneNumber: "",
    accountReference: input.accountReference,
    plan: input.plan,
    schemeSubject: null,
    schemeLevel: null,
    schemeTerm: null,
    resourceId: null,
    paymentReference: paymentId,
    authorizationUrl: null,
    checkoutRequestId: null,
    merchantRequestId: null,
    mpesaReceiptNumber: null,
    resultCode: null,
    resultDesc: null,
    createdAt,
    updatedAt: createdAt
  };
  const subscription: SubscriptionRecord = {
    id: subscriptionId,
    userId: input.userId,
    plan: input.plan,
    status: "pending",
    amount: plan.amount,
    levelAccess,
    startDate: null,
    endDate: null,
    createdAt,
    updatedAt: createdAt,
    paymentId
  };
  await createSubscriptionPaymentBundle({ payment, subscription });

  try {
    const result = await initializePaystackTransaction({
      email: input.email,
      amount: plan.amount,
      reference: paymentId,
      callbackUrl: getPaystackCallbackUrl(),
      metadata: {
        paymentId,
        subscriptionId,
        kind: "subscription",
        plan: input.plan,
        accountReference: input.accountReference,
        level: input.level
      }
    });

    await updatePaymentById(paymentId, {
      paymentReference: result.reference,
      authorizationUrl: result.authorization_url,
      updatedAt: new Date().toISOString()
    });

    return {
      ok: true,
      paymentId,
      subscriptionId,
      result: {
        authorization_url: result.authorization_url,
        reference: result.reference
      }
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "M-Pesa checkout is not configured yet. Payment saved as pending.";

    await updatePaymentById(paymentId, {
      resultDesc: message,
      updatedAt: new Date().toISOString()
    });

    return {
      ok: true,
      paymentId,
      subscriptionId,
      result: {
        authorization_url: null,
        reference: paymentId,
        mock: true,
        message: "Subscription saved. Finish the M-Pesa checkout setup to continue."
      }
    };
  }
}

export async function createPendingSchemePayment(input: {
  userId: string;
  email: string;
  accountReference: string;
  resource: ResourceRecord;
}) {
  const paymentId = createId("pay");
  const schemeId = createId("scheme");
  const createdAt = new Date().toISOString();

  const payment: PaymentRecord = {
    id: paymentId,
    userId: input.userId,
    kind: "scheme",
    status: "pending",
    provider: "paystack",
    currency: "KES",
    amount: schemeOfWorkPrice,
    phoneNumber: "",
    accountReference: input.accountReference,
    plan: null,
    schemeSubject: input.resource.subject,
    schemeLevel: input.resource.level,
    schemeTerm: input.resource.term ?? null,
    resourceId: input.resource.id,
    paymentReference: paymentId,
    authorizationUrl: null,
    checkoutRequestId: null,
    merchantRequestId: null,
    mpesaReceiptNumber: null,
    resultCode: null,
    resultDesc: null,
    createdAt,
    updatedAt: createdAt
  };
  const schemePurchase: SchemePurchaseRecord = {
    id: schemeId,
    userId: input.userId,
    resourceId: input.resource.id,
    subject: input.resource.subject,
    level: input.resource.level,
    term: input.resource.term ?? null,
    amount: schemeOfWorkPrice,
    status: "pending",
    paymentId,
    createdAt,
    updatedAt: createdAt
  };
  await createSchemePaymentBundle({ payment, schemePurchase });

  try {
    const result = await initializePaystackTransaction({
      email: input.email,
      amount: schemeOfWorkPrice,
      reference: paymentId,
      callbackUrl: getPaystackCallbackUrl(),
      metadata: {
        paymentId,
        schemeId,
        kind: "scheme",
        resourceId: input.resource.id,
        title: input.resource.title,
        subject: input.resource.subject,
        level: input.resource.level,
        term: input.resource.term ?? null,
        accountReference: input.accountReference
      }
    });

    await updatePaymentById(paymentId, {
      paymentReference: result.reference,
      authorizationUrl: result.authorization_url,
      updatedAt: new Date().toISOString()
    });

    return {
      ok: true,
      result: {
        authorization_url: result.authorization_url,
        reference: result.reference
      }
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "M-Pesa checkout is not configured yet. Payment saved as pending.";

    await updatePaymentById(paymentId, {
      resultDesc: message,
      updatedAt: new Date().toISOString()
    });

    return {
      ok: true,
      result: {
        authorization_url: null,
        reference: paymentId,
        mock: true,
        message: "Scheme purchase saved. Finish the M-Pesa checkout setup to continue."
      }
    };
  }
}

export async function createPendingResourcePayment(input: {
  userId: string;
  email: string;
  accountReference: string;
  resource: ResourceRecord;
}) {
  const paymentId = createId("pay");
  const resourcePurchaseId = createId("resource-purchase");
  const createdAt = new Date().toISOString();

  const payment: PaymentRecord = {
    id: paymentId,
    userId: input.userId,
    kind: "resource",
    status: "pending",
    provider: "paystack",
    currency: "KES",
    amount: teacherMaterialPrice,
    phoneNumber: "",
    accountReference: input.accountReference,
    plan: null,
    schemeSubject: null,
    schemeLevel: null,
    schemeTerm: null,
    resourceId: input.resource.id,
    paymentReference: paymentId,
    authorizationUrl: null,
    checkoutRequestId: null,
    merchantRequestId: null,
    mpesaReceiptNumber: null,
    resultCode: null,
    resultDesc: null,
    createdAt,
    updatedAt: createdAt
  };

  const resourcePurchase: ResourcePurchaseRecord = {
    id: resourcePurchaseId,
    userId: input.userId,
    resourceId: input.resource.id,
    title: input.resource.title,
    level: input.resource.level,
    subject: input.resource.subject,
    section: input.resource.section ?? "notes",
    assessmentSet: input.resource.assessmentSet ?? null,
    amount: teacherMaterialPrice,
    status: "pending",
    paymentId,
    createdAt,
    updatedAt: createdAt
  };

  await createResourcePaymentBundle({ payment, resourcePurchase });

  try {
    const result = await initializePaystackTransaction({
      email: input.email,
      amount: teacherMaterialPrice,
      reference: paymentId,
      callbackUrl: getPaystackCallbackUrl(),
      metadata: {
        paymentId,
        resourcePurchaseId,
        kind: "resource",
        resourceId: input.resource.id,
        title: input.resource.title,
        level: input.resource.level,
        subject: input.resource.subject,
        section: input.resource.section ?? "notes",
        assessmentSet: input.resource.assessmentSet,
        accountReference: input.accountReference
      }
    });

    await updatePaymentById(paymentId, {
      paymentReference: result.reference,
      authorizationUrl: result.authorization_url,
      updatedAt: new Date().toISOString()
    });

    return {
      ok: true,
      result: {
        authorization_url: result.authorization_url,
        reference: result.reference
      }
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "M-Pesa checkout is not configured yet. Payment saved as pending.";

    await updatePaymentById(paymentId, {
      resultDesc: message,
      updatedAt: new Date().toISOString()
    });

    return {
      ok: true,
      result: {
        authorization_url: null,
        reference: paymentId,
        mock: true,
        message: "Material purchase saved. Finish the M-Pesa checkout setup to continue."
      }
    };
  }
}

export async function verifyAndApplyPaystackPayment(reference: string) {
  const result = await verifyPaystackTransaction(reference);
  const paid = result.status === "success";
  const updatedAt = new Date().toISOString();

  const payment = await findPaymentByReference(reference);
  if (!payment) {
    throw new Error("Payment not found for Paystack reference.");
  }
  await markPaymentOutcome(payment.id, {
    paymentChanges: {
      status: paid ? "paid" : "failed",
      currency: result.currency,
      paymentReference: result.reference,
      resultDesc: result.gateway_response,
      updatedAt
    },
    subscriptionStatus: {
      status: paid ? "active" : "failed",
      startDate: paid ? updatedAt : null,
      endDate: paid ? addDays(30) : null,
      updatedAt
    },
    schemeStatus: {
      status: paid ? "paid" : "failed",
      updatedAt
    },
    resourceStatus: {
      status: paid ? "paid" : "failed",
      updatedAt
    }
  });

  return result;
}

export async function reconcilePaidPaystackPaymentsForUser(userId: string) {
  const store = await readAppData();
  const pendingPayments = store.payments
    .filter(
      (payment) =>
        payment.userId === userId &&
        payment.provider === "paystack" &&
        payment.status === "pending" &&
        !!(payment.paymentReference ?? payment.id)
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5);

  for (const payment of pendingPayments) {
    try {
      const result = await verifyPaystackTransaction(payment.paymentReference ?? payment.id);

      if (result.status === "success") {
        await markPaymentOutcome(payment.id, {
          paymentChanges: {
            status: "paid",
            currency: result.currency,
            paymentReference: result.reference,
            resultDesc: result.gateway_response,
            updatedAt: new Date().toISOString()
          },
          subscriptionStatus: {
            status: "active",
            startDate: new Date().toISOString(),
            endDate: addDays(30),
            updatedAt: new Date().toISOString()
          },
          schemeStatus: {
            status: "paid",
            updatedAt: new Date().toISOString()
          },
          resourceStatus: {
            status: "paid",
            updatedAt: new Date().toISOString()
          }
        });
      }
    } catch {
      // Ignore reconciliation errors so the dashboard still loads.
    }
  }
}

export async function manuallyGrantSubscriptionAccess(subscriptionId: string) {
  const store = await readAppData();
  const subscription = store.subscriptions.find((entry) => entry.id === subscriptionId);

  if (!subscription) {
    throw new Error("Subscription not found.");
  }

  if (subscription.status === "active") {
    return subscription;
  }

  const updatedAt = new Date().toISOString();
  await markPaymentOutcome(subscription.paymentId, {
    paymentChanges: {
      status: "paid",
      resultDesc: "Manually approved by admin.",
      updatedAt
    },
    subscriptionStatus: {
      status: "active",
      startDate: subscription.startDate ?? updatedAt,
      endDate: addDays(30),
      updatedAt
    }
  });

  const refreshedStore = await readAppData();
  const refreshedSubscription = refreshedStore.subscriptions.find((entry) => entry.id === subscriptionId);

  if (!refreshedSubscription) {
    throw new Error("Subscription could not be reloaded after granting access.");
  }

  return refreshedSubscription;
}
