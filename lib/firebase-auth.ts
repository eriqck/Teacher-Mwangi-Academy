type FirebasePasswordSignInResponse = {
  email?: string;
  localId?: string;
  idToken?: string;
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

  return {
    email: data.email.trim().toLowerCase(),
    firebaseUid: data.localId ?? ""
  };
}
