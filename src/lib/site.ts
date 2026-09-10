export function siteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "https://itag-prop.vercel.app";
}

export function propertyPublicUrl(qrToken: string) {
  return `${siteUrl()}/p/${encodeURIComponent(qrToken)}`;
}

export function throwIfError(error: { message: string } | null, fallback = "Request failed.") {
  if (error) throw new Error(error.message || fallback);
}
