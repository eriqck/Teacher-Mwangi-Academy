type MpesaTokenResponse = {
  access_token: string;
  expires_in: string;
};

type StkPushInput = {
  amount: number;
  phoneNumber: string;
  accountReference: string;
  transactionDesc: string;
};

const baseUrl =
  process.env.MPESA_ENVIRONMENT === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export async function getMpesaAccessToken() {
  const consumerKey = getRequiredEnv("MPESA_CONSUMER_KEY");
  const consumerSecret = getRequiredEnv("MPESA_CONSUMER_SECRET");
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to get M-Pesa token: ${response.status}`);
  }

  const payload = (await response.json()) as MpesaTokenResponse;
  return payload.access_token;
}

function formatTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export async function initiateStkPush(input: StkPushInput) {
  const token = await getMpesaAccessToken();
  const shortcode = getRequiredEnv("MPESA_SHORTCODE");
  const passkey = getRequiredEnv("MPESA_PASSKEY");
  const callbackUrl = getRequiredEnv("MPESA_CALLBACK_URL");
  const timestamp = formatTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: input.amount,
    PartyA: input.phoneNumber,
    PartyB: shortcode,
    PhoneNumber: input.phoneNumber,
    CallBackURL: callbackUrl,
    AccountReference: input.accountReference,
    TransactionDesc: input.transactionDesc
  };

  const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to initiate STK push: ${response.status}`);
  }

  return response.json();
}
