import { createId } from "@/lib/auth";
import { getPaystackCallbackUrl, initializePaystackTransaction, verifyPaystackTransaction } from "@/lib/paystack";
import { subscriptionPlans } from "@/lib/business";
import type { PaymentRecord, SchemePurchaseRecord, SubscriptionPlan, SubscriptionRecord } from "@/lib/store";
import {
  createSchemePaymentBundle,
  createSubscriptionPaymentBundle,
  findPaymentByReference,
  markPaymentOutcome,
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
      error instanceof Error ? error.message : "Paystack is not configured yet. Payment saved as pending.";

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
        message: "Subscription saved. Add Paystack keys to continue checkout."
      }
    };
  }
}

export async function createPendingSchemePayment(input: {
  userId: string;
  email: string;
  accountReference: string;
  subject: string;
  level: string;
  amount: number;
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
    amount: input.amount,
    phoneNumber: "",
    accountReference: input.accountReference,
    plan: null,
    schemeSubject: input.subject,
    schemeLevel: input.level,
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
    subject: input.subject,
    level: input.level,
    amount: input.amount,
    status: "pending",
    paymentId,
    createdAt,
    updatedAt: createdAt
  };
  await createSchemePaymentBundle({ payment, schemePurchase });

  try {
    const result = await initializePaystackTransaction({
      email: input.email,
      amount: input.amount,
      reference: paymentId,
      callbackUrl: getPaystackCallbackUrl(),
      metadata: {
        paymentId,
        schemeId,
        kind: "scheme",
        subject: input.subject,
        level: input.level,
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
      error instanceof Error ? error.message : "Paystack is not configured yet. Payment saved as pending.";

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
        message: "Scheme purchase saved. Add Paystack keys to continue checkout."
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
    }
  });

  return result;
}
