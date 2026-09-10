export { createClient } from "@supabase/supabase-js";

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function appOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://itag-prop.vercel.app").replace(/\/$/, "");
}

export function qrUrl(token: string) {
  return `${appOrigin()}/p/${encodeURIComponent(token)}`;
}
