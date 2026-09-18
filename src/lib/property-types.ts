import type { ConsumableSupply, PropertyClassification, PropertyRecord } from "@/types";

export type PropertyTypeOption = { label: string; code: string };

export const SEMI_EXPENDABLE_TYPES: PropertyTypeOption[] = [
  { label: "Office Equipment", code: "OFF" },
  { label: "ICT Equipment", code: "ICT" },
  { label: "Disaster Risk Reduction Expenditures", code: "DRR" },
  { label: "Medical Equipment", code: "MED" },
  { label: "Sports Equipment", code: "SPT" },
  { label: "Furniture and Fixtures", code: "FUR" },
  { label: "Communication Equipment", code: "COM" },
  { label: "Technical & Science Equipment", code: "TSE" },
  { label: "Machinery and Equipment", code: "MAC" },
  { label: "Others", code: "OTH" },
];

export const CONSUMABLE_TYPES: PropertyTypeOption[] = [
  { label: "Office Supplies", code: "OSP" },
  { label: "Medical Supplies", code: "MSP" },
  { label: "Construction Materials", code: "CMT" },
  { label: "Food Supplies", code: "FSP" },
  { label: "Janitorial Supplies", code: "JSP" },
  { label: "Spare Parts", code: "SPR" },
  { label: "Laboratory Supplies", code: "LSP" },
  { label: "Kitchen Supplies", code: "KSP" },
  { label: "Others", code: "OTH" },
];

export function isSemiExpendableProperty(classification: PropertyClassification) {
  return (
    classification === "low_value" ||
    classification === "high_value" ||
    classification === "semi_expendable"
  );
}

export function typesForClassification(classification: PropertyClassification): PropertyTypeOption[] {
  if (isSemiExpendableProperty(classification)) return SEMI_EXPENDABLE_TYPES;
  if (classification === "consumable") return CONSUMABLE_TYPES;
  return [];
}

export function codeForType(classification: PropertyClassification, typeLabel: string): string {
  const match = typesForClassification(classification).find((t) => t.label === typeLabel);
  return match?.code ?? "";
}

export function classificationNeedsType(classification: PropertyClassification): boolean {
  return isSemiExpendableProperty(classification) || classification === "consumable";
}

export function normalizeTypeFields(
  classification: PropertyClassification,
  type: string,
  code: string,
): { type: string; code: string } {
  if (!classificationNeedsType(classification)) {
    return { type: "", code: "" };
  }
  const expected = codeForType(classification, type);
  if (!type || !expected || expected !== code) {
    return { type: type || "", code: expected || "" };
  }
  return { type, code: expected };
}

export function validateTypeFields(
  classification: PropertyClassification,
  type: string,
  code: string,
): { type?: string; code?: string } {
  if (!classificationNeedsType(classification)) return {};
  const label =
    classification === "consumable" ? "Consumable Type" : "Semi-Expendable Property Type";
  if (!type.trim()) return { type: `${label} is required.` };
  const expected = codeForType(classification, type);
  if (!expected) return { type: `Select a valid ${label}.` };
  if (code !== expected) return { code: `Code must be ${expected} for the selected type.` };
  return {};
}

export function classificationLabel(value: PropertyClassification): string {
  if (value === "low_value") return "Low Value";
  if (value === "high_value") return "High Value";
  if (value === "semi_expendable") return "Semi-Expendable";
  return "Consumable";
}

export type TypeGroup<T> = {
  key: string;
  label: string;
  code: string;
  items: T[];
};

function typeGroupOrder(options: PropertyTypeOption[], type: string, code: string) {
  const byLabel = options.findIndex((t) => t.label === type);
  if (byLabel >= 0) return byLabel;
  const byCode = options.findIndex((t) => t.code === code);
  if (byCode >= 0) return byCode;
  return options.length + 1;
}

/** Group properties by Semi-Expendable Property Type (Low/High Value stay per-item attributes). */
export function groupPropertiesBySemiExpendableType(properties: PropertyRecord[]): TypeGroup<PropertyRecord>[] {
  const map = new Map<string, TypeGroup<PropertyRecord>>();
  for (const property of properties) {
    const isSemi = isSemiExpendableProperty(property.classification);
    const known = SEMI_EXPENDABLE_TYPES.find(
      (t) => t.label === property.type || t.code === property.code,
    );
    const label = isSemi
      ? known?.label || property.type || "Unclassified Semi-Expendable"
      : classificationLabel(property.classification);
    const code = isSemi ? known?.code || property.code || "" : "";
    const key = isSemi ? `semi:${code || label}` : `other:${property.classification}`;
    const group = map.get(key) ?? { key, label, code, items: [] };
    group.items.push(property);
    map.set(key, group);
  }

  return [...map.values()]
    .map((group) => ({
      ...group,
      items: group.items
        .slice()
        .sort((a, b) => a.inventoryItemNumber.localeCompare(b.inventoryItemNumber)),
    }))
    .sort((a, b) => {
      const aSemi = a.key.startsWith("semi:");
      const bSemi = b.key.startsWith("semi:");
      if (aSemi && bSemi) {
        return (
          typeGroupOrder(SEMI_EXPENDABLE_TYPES, a.label, a.code) -
          typeGroupOrder(SEMI_EXPENDABLE_TYPES, b.label, b.code)
        );
      }
      if (aSemi !== bSemi) return aSemi ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
}

/** Group consumable supplies by saved Consumable Type/code. */
export function groupSuppliesByConsumableType(supplies: ConsumableSupply[]): TypeGroup<ConsumableSupply>[] {
  const map = new Map<string, TypeGroup<ConsumableSupply>>();
  for (const supply of supplies) {
    const known = CONSUMABLE_TYPES.find((t) => t.label === supply.type || t.code === supply.code);
    const label = known?.label || supply.type || "Unclassified Consumable";
    const code = known?.code || supply.code || "";
    const key = `cons:${code || label}`;
    const group = map.get(key) ?? { key, label, code, items: [] };
    group.items.push(supply);
    map.set(key, group);
  }

  return [...map.values()]
    .map((group) => ({
      ...group,
      items: group.items.slice().sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort(
      (a, b) =>
        typeGroupOrder(CONSUMABLE_TYPES, a.label, a.code) -
        typeGroupOrder(CONSUMABLE_TYPES, b.label, b.code),
    );
}
