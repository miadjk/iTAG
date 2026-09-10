import { normalizeKey } from "@/lib/utils";
import type { PropertyRecord } from "@/types";

export type PropertySearchResult =
  | { kind: "empty"; query: string }
  | { kind: "item"; query: string; property: PropertyRecord }
  | { kind: "group"; query: string; icsNumber: string; properties: PropertyRecord[] }
  | { kind: "none"; query: string }
  | { kind: "ambiguous"; query: string; items: PropertyRecord[]; groups: { icsNumber: string; properties: PropertyRecord[] }[] };

export function groupByIcs(properties: PropertyRecord[]) {
  const map = new Map<string, PropertyRecord[]>();
  for (const property of properties) {
    const key = normalizeKey(property.icsNumber);
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(property);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([icsNumber, items]) => ({
      icsNumber: items[0]?.icsNumber || icsNumber,
      properties: items.slice().sort((a, b) => a.inventoryItemNumber.localeCompare(b.inventoryItemNumber)),
    }));
}

export function searchProperties(properties: PropertyRecord[], rawQuery: string): PropertySearchResult {
  const query = normalizeKey(rawQuery);
  if (!query) return { kind: "empty", query };

  const lower = query.toLowerCase();
  const exactItem = properties.filter((p) => normalizeKey(p.inventoryItemNumber).toLowerCase() === lower);
  if (exactItem.length === 1) return { kind: "item", query, property: exactItem[0] };
  if (exactItem.length > 1) {
    return { kind: "ambiguous", query, items: exactItem, groups: [] };
  }

  const exactIcs = properties.filter((p) => normalizeKey(p.icsNumber).toLowerCase() === lower);
  if (exactIcs.length) {
    return {
      kind: "group",
      query,
      icsNumber: exactIcs[0].icsNumber,
      properties: exactIcs.slice().sort((a, b) => a.inventoryItemNumber.localeCompare(b.inventoryItemNumber)),
    };
  }

  const partialItems = properties.filter((p) => normalizeKey(p.inventoryItemNumber).toLowerCase().includes(lower));
  const partialGroups = groupByIcs(properties).filter((g) => normalizeKey(g.icsNumber).toLowerCase().includes(lower));

  if (!partialItems.length && !partialGroups.length) return { kind: "none", query };
  if (partialItems.length === 1 && partialGroups.length === 0) {
    return { kind: "item", query, property: partialItems[0] };
  }
  if (partialGroups.length === 1 && partialItems.every((p) => normalizeKey(p.icsNumber).toLowerCase() === normalizeKey(partialGroups[0].icsNumber).toLowerCase())) {
    return { kind: "group", query, icsNumber: partialGroups[0].icsNumber, properties: partialGroups[0].properties };
  }
  return { kind: "ambiguous", query, items: partialItems, groups: partialGroups };
}
