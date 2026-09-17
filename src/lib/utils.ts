export async function hashSecret(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isNineDigitPassword(value: string) {
  return /^\d{9}$/.test(value);
}

export function uid(prefix = "id") {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value.includes("T") || value.includes(" ") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Full date+time in Philippine local time for assignment/transfer transactions. */
export function formatManilaDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Calendar date (YYYY-MM-DD) in Asia/Manila for DB `date` columns. */
export function manilaDateOnly(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

export function formatLongDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value || 0);
}

export function displayName(person: {
  firstName: string;
  middleName?: string;
  lastName: string;
}) {
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
}

export function deriveSupplyStatus(quantity: number, minimum: number) {
  if (quantity <= 0) return "out_of_stock" as const;
  if (quantity <= minimum) return "low_stock" as const;
  return "available" as const;
}

export function normalizeKey(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
