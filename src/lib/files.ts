import type { PropertyRecord } from "@/types";

export function itemsForIcsForm(property: PropertyRecord, all: PropertyRecord[] = []) {
  const ics = property.icsNumber?.trim();
  const schoolId = property.schoolId;
  const group = ics
    ? all.filter((item) => item.schoolId === schoolId && item.icsNumber?.trim() === ics)
    : [property];
  const unique = group.length ? group : [property];
  const selected = unique.find((item) => item.id === property.id);
  const rest = unique.filter((item) => item.id !== property.id);
  return [selected ?? property, ...rest];
}

export async function downloadIcsExcel(icsNumber: string) {
  const res = await fetch("/api/excel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ icsNumber }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: "Unable to download Excel." }));
    throw new Error(payload.error || "Unable to download Excel.");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${icsNumber || "ICSNO"}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadPropertyExcel(property: PropertyRecord, _all: PropertyRecord[] = []) {
  await downloadIcsExcel(property.icsNumber);
}
