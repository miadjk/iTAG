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
  return [selected ?? property, ...rest].slice(0, 17);
}

export async function downloadPropertyExcel(property: PropertyRecord, all: PropertyRecord[] = []) {
  const items = itemsForIcsForm(property, all);
  if (!property.entityName?.trim() || !property.icsNumber?.trim() || !property.description?.trim()) {
    return;
  }
  const res = await fetch("/api/excel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entityName: property.entityName,
      icsNumber: property.icsNumber,
      fundCluster: property.fundCluster,
      custodianLastUser: property.custodianLastUser,
      currentAccountablePerson: property.currentAccountablePerson,
      dateAcquired: property.dateAcquired,
      items,
    }),
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${property.icsNumber || property.inventoryItemNumber || "AVR"}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
