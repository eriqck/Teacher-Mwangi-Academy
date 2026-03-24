type InitializeTransactionInput = {
  email: string;
  amount: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    gateway_response: string;
    paid_at?: string;
    customer?: {
      email?: string;
    };
  };
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function getPaystackCallbackUrl() {
  return (
    process.env.PAYSTACK_CALLBACK_URL ||
    `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3004"}/api/paystack/callback`
  );
}

export async function initializePaystackTransaction(input: InitializeTransactionInput) {
  const secretKey = getRequiredEnv("PAYSTACK_SECRET_KEY");

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amount * 100,
      currency: "KES",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {}
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to initialize Paystack transaction: ${response.status}`);
  }

  const payload = (await response.json()) as PaystackInitializeResponse;
  return payload.data;
}

export async function verifyPaystackTransaction(reference: string) {
  const secretKey = getRequiredEnv("PAYSTACK_SECRET_KEY");
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to verify Paystack transaction: ${response.status}`);
  }

  const payload = (await response.json()) as PaystackVerifyResponse;
  return payload.data;
}
