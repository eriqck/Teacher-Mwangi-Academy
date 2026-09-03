type FirebasePasswordSignInResponse = {
  email?: string;
  displayName?: string;
  localId?: string;
  idToken?: string;
};

type FirebaseLookupResponse = {
  users?: Array<{
    email?: string;
    displayName?: string;
    localId?: string;
    customAttributes?: string;
  }>;
};

type FirebaseCustomAttributes = {
  role?: string;
  legacyUserId?: string;
  phoneNumber?: string;
};

function getFirebaseApiKey() {
  return process.env.FIREBASE_WEB_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
}

export function isFirebasePasswordAuthConfigured() {
  return Boolean(getFirebaseApiKey());
}

export async function verifyFirebasePasswordSignIn(email: string, password: string) {
  const apiKey = getFirebaseApiKey();

  if (!apiKey) {
    return null;
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        returnSecureToken: true
      })
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as FirebasePasswordSignInResponse;

  if (!data.email || !data.idToken) {
    return null;
  }

  let customAttributes: FirebaseCustomAttributes = {};
  let displayName = data.displayName ?? "";

  const lookupResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        idToken: data.idToken
      })
    }
  );

  if (lookupResponse.ok) {
    const lookup = (await lookupResponse.json()) as FirebaseLookupResponse;
    const profile = lookup.users?.[0];
    displayName = profile?.displayName ?? displayName;

    if (profile?.customAttributes) {
      try {
        customAttributes = JSON.parse(profile.customAttributes) as FirebaseCustomAttributes;
      } catch {
        customAttributes = {};
      }
    }
  }

  return {
    email: data.email.trim().toLowerCase(),
    firebaseUid: data.localId ?? "",
    displayName,
    role: customAttributes.role,
    legacyUserId: customAttributes.legacyUserId,
    phoneNumber: customAttributes.phoneNumber
  };
}
