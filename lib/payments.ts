import { createId } from "@/lib/auth";
import { levels } from "@/lib/catalog";
import { getPaystackCallbackUrl, initializePaystackTransaction, verifyPaystackTransaction } from "@/lib/paystack";
import { schemeOfWorkPrice, subscriptionPlans, teacherMaterialPrice, teacherLessonPlanPrice, teacherSchemeGenerationPrice } from "@/lib/business";
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
  findGeneratedLessonPlanRequestByPaymentId,
  findGeneratedSchemeRequestByPaymentId,
  markPaymentOutcome,
  findUserById,
  readAppData,
  saveGeneratedLessonPlanRecord,
  saveGeneratedLessonPlanRequestRecord,
  savePaymentRecord,
  saveGeneratedSchemeRecord,
  updateGeneratedLessonPlanRequestRecord,
  updateGeneratedSchemeRequestRecord,
  updateUserRole,
  updatePaymentById
} from "@/lib/repository";
import { buildGeneratedLessonPlan } from "@/lib/lesson-plan-generator";
import { buildGeneratedScheme } from "@/lib/scheme-generator";

function addDays(days: number) {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now.toISOString();
}

export async function createPendingSubscriptionPayment(input: {
  userId: string;
  email: string;
  phoneNumber: string;
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
    phoneNumber: input.phoneNumber,
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
  phoneNumber: string;
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
    phoneNumber: input.phoneNumber,
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
      paymentId,
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
  phoneNumber: string;
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
    phoneNumber: input.phoneNumber,
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
      paymentId,
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
      result: {
        authorization_url: null,
        reference: paymentId,
        mock: true,
        message: "Material purchase saved. Finish the M-Pesa checkout setup to continue."
      }
    };
  }
}

export async function createPendingSchemeGenerationPayment(input: {
  userId: string;
  email: string;
  phoneNumber: string;
  accountReference: string;
  title: string;
}) {
  const paymentId = createId("pay");
  const createdAt = new Date().toISOString();

  const payment: PaymentRecord = {
    id: paymentId,
    userId: input.userId,
    kind: "generated-scheme",
    status: "pending",
    provider: "paystack",
    currency: "KES",
    amount: teacherSchemeGenerationPrice,
    phoneNumber: input.phoneNumber,
    accountReference: input.accountReference,
    plan: null,
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
  await savePaymentRecord(payment);

  try {
    const result = await initializePaystackTransaction({
      email: input.email,
      amount: teacherSchemeGenerationPrice,
      reference: paymentId,
      callbackUrl: getPaystackCallbackUrl(),
      metadata: {
        paymentId,
        kind: "generated-scheme",
        title: input.title,
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
      paymentId,
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
      result: {
        authorization_url: null,
        reference: paymentId,
        mock: true,
        message: "Scheme generation payment saved. Finish the M-Pesa checkout setup to continue."
      }
    };
  }
}

export async function createPendingLessonPlanGenerationPayment(input: {
  userId: string;
  email: string;
  phoneNumber: string;
  accountReference: string;
  title: string;
  amount?: number;
}) {
  const paymentId = createId("pay");
  const createdAt = new Date().toISOString();
  const amount = Math.max(teacherLessonPlanPrice, input.amount ?? teacherLessonPlanPrice);

  const payment: PaymentRecord = {
    id: paymentId,
    userId: input.userId,
    kind: "generated-lesson-plan",
    status: "pending",
    provider: "paystack",
    currency: "KES",
    amount,
    phoneNumber: input.phoneNumber,
    accountReference: input.accountReference,
    plan: null,
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
  await savePaymentRecord(payment);

  try {
    const result = await initializePaystackTransaction({
      email: input.email,
      amount,
      reference: paymentId,
      callbackUrl: getPaystackCallbackUrl(),
      metadata: {
        paymentId,
        kind: "generated-lesson-plan",
        title: input.title,
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
      paymentId,
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
      result: {
        authorization_url: null,
        reference: paymentId,
        mock: true,
        message: "Lesson-plan generation payment saved. Finish the M-Pesa checkout setup to continue."
      }
    };
  }
}

async function applyVerifiedPaystackPaymentOutcome(
  payment: PaymentRecord,
  result: Awaited<ReturnType<typeof verifyPaystackTransaction>>
) {
  const paid = result.status === "success";
  const updatedAt = new Date().toISOString();

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

  let redirectPath = `/dashboard?payment=${paid ? "success" : "failed"}`;

  if (payment.kind === "generated-scheme" || payment.kind === "tool-access") {
    const request = await findGeneratedSchemeRequestByPaymentId(payment.id);

    if (request) {
      if (paid) {
        if (request.generatedSchemeId) {
          await updateGeneratedSchemeRequestRecord(request.id, {
            status: "completed",
            updatedAt
          });
          redirectPath = `/teacher-tools/schemes/${request.generatedSchemeId}?payment=success`;
        } else {
          const generatedScheme = buildGeneratedScheme({
            id: createId("generated_scheme"),
            userId: request.userId,
            createdAt: updatedAt,
            ...request.payload
          });

          await saveGeneratedSchemeRecord(generatedScheme);
          await updateGeneratedSchemeRequestRecord(request.id, {
            status: "completed",
            generatedSchemeId: generatedScheme.id,
            updatedAt
          });
          redirectPath = `/teacher-tools/schemes/${generatedScheme.id}?payment=success`;
        }
      } else {
        await updateGeneratedSchemeRequestRecord(request.id, {
          status: "failed",
          updatedAt
        });
        redirectPath = "/teacher-tools/schemes/new?payment=failed";
      }
    } else {
      redirectPath = `/teacher-tools?payment=${paid ? "success" : "failed"}`;
    }
  }

  if (payment.kind === "generated-lesson-plan") {
    const request = await findGeneratedLessonPlanRequestByPaymentId(payment.id);

    if (request) {
      if (paid) {
        if (request.generatedLessonPlanId) {
          await updateGeneratedLessonPlanRequestRecord(request.id, {
            status: "completed",
            updatedAt
          });
          redirectPath = `/teacher-tools/lesson-plans/generated/${request.generatedLessonPlanId}?payment=success`;
        } else {
          const generatedLessonPlan = buildGeneratedLessonPlan({
            id: createId("generated_lesson_plan"),
            userId: request.userId,
            createdAt: updatedAt,
            ...request.payload
          });

          await saveGeneratedLessonPlanRecord(generatedLessonPlan);
          await updateGeneratedLessonPlanRequestRecord(request.id, {
            status: "completed",
            generatedLessonPlanId: generatedLessonPlan.id,
            updatedAt
          });
          redirectPath = `/teacher-tools/lesson-plans/generated/${generatedLessonPlan.id}?payment=success`;
        }
      } else {
        await updateGeneratedLessonPlanRequestRecord(request.id, {
          status: "failed",
          updatedAt
        });
        redirectPath = "/teacher-tools/lesson-plans?payment=failed";
      }
    } else {
      redirectPath = `/teacher-tools/lesson-plans?payment=${paid ? "success" : "failed"}`;
    }
  }

  return {
    paid,
    redirectPath
  };
}

export async function verifyAndApplyPaystackPayment(reference: string) {
  const result = await verifyPaystackTransaction(reference);

  const payment = await findPaymentByReference(reference);
  if (!payment) {
    throw new Error("Payment not found for Paystack reference.");
  }
  const { redirectPath } = await applyVerifiedPaystackPaymentOutcome(payment, result);

  return {
    ...result,
    redirectPath
  };
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
        await applyVerifiedPaystackPaymentOutcome(payment, result);
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

export async function adminAssignMembership(input: {
  userId: string;
  plan: SubscriptionPlan;
}) {
  const user = await findUserById(input.userId);

  if (!user) {
    throw new Error("User account not found.");
  }

  if (user.role === "admin") {
    throw new Error("Admin accounts cannot be assigned subscriber membership here.");
  }

  const plan = subscriptionPlans[input.plan];
  const now = new Date().toISOString();
  const endDate = addDays(30);
  const levelAccess =
    plan.levelAccessMode === "all" ? [] : levels.map((level) => level.id);

  if (user.role !== plan.role) {
    await updateUserRole({
      userId: user.id,
      role: plan.role
    });
  }

  const store = await readAppData();
  const latestSubscription = store.subscriptions
    .filter((entry) => entry.userId === user.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

  if (latestSubscription) {
    await markPaymentOutcome(latestSubscription.paymentId, {
      paymentChanges: {
        status: "paid",
        amount: plan.amount,
        plan: input.plan,
        currency: "KES",
        phoneNumber: user.phoneNumber,
        resultDesc: "Manually updated by admin.",
        updatedAt: now
      },
      subscriptionStatus: {
        plan: input.plan,
        status: "active",
        amount: plan.amount,
        levelAccess,
        startDate: latestSubscription.startDate ?? now,
        endDate,
        updatedAt: now
      }
    });

    const refreshedStore = await readAppData();
    const refreshedSubscription = refreshedStore.subscriptions.find(
      (entry) => entry.id === latestSubscription.id
    );

    if (!refreshedSubscription) {
      throw new Error("Membership was updated but could not be reloaded.");
    }

    return {
      user: await findUserById(user.id),
      subscription: refreshedSubscription
    };
  }

  const paymentId = createId("pay");
  const subscriptionId = createId("sub");

  await createSubscriptionPaymentBundle({
    payment: {
      id: paymentId,
      userId: user.id,
      kind: "subscription",
      status: "paid",
      currency: "KES",
      amount: plan.amount,
      phoneNumber: user.phoneNumber,
      accountReference: `${user.fullName} manual admin assignment`,
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
      resultDesc: "Manually created by admin.",
      createdAt: now,
      updatedAt: now
    },
    subscription: {
      id: subscriptionId,
      userId: user.id,
      plan: input.plan,
      status: "active",
      amount: plan.amount,
      levelAccess,
      startDate: now,
      endDate,
      createdAt: now,
      updatedAt: now,
      paymentId
    }
  });

  const refreshedStore = await readAppData();
  const createdSubscription = refreshedStore.subscriptions.find(
    (entry) => entry.id === subscriptionId
  );

  if (!createdSubscription) {
    throw new Error("Membership was created but could not be reloaded.");
  }

  return {
    user: await findUserById(user.id),
    subscription: createdSubscription
  };
}
