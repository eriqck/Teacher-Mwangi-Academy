const LOCAL_FALLBACK_URL = "http://localhost:3004";

function normalizeUrl(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return fallback;
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const normalized = new URL(candidate);
    normalized.hash = "";
    normalized.search = "";
    return normalized.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

export function getSiteUrl() {
  const vercelFallback = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : LOCAL_FALLBACK_URL;
  return normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL, vercelFallback);
}

export function getAbsoluteUrl(pathname: string) {
  return new URL(pathname, getSiteUrl()).toString();
}

export function getConfiguredAbsoluteUrl(value: string | null | undefined, pathnameFallback: string) {
  const normalized = normalizeUrl(value, "");
  return normalized || getAbsoluteUrl(pathnameFallback);
}
