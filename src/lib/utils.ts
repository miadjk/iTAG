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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
