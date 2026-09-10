export const SCHOOL_HEAD_HOST = "sh-itag-prop.vercel.app";

export function hostnameOf(hostHeader?: string | null) {
  return (hostHeader || "").split(",")[0].trim().split(":")[0].toLowerCase();
}

export function isSchoolHeadHost(hostHeader?: string | null) {
  const host = hostnameOf(hostHeader);
  return host === SCHOOL_HEAD_HOST || host === "sh.itag-prop.vercel.app" || host === "sh.localhost";
}
