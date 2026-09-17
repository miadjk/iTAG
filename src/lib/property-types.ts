import type { PropertyClassification } from "@/types";

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

export function typesForClassification(classification: PropertyClassification): PropertyTypeOption[] {
  if (classification === "semi_expendable") return SEMI_EXPENDABLE_TYPES;
  if (classification === "consumable") return CONSUMABLE_TYPES;
  return [];
}

export function codeForType(classification: PropertyClassification, typeLabel: string): string {
  const match = typesForClassification(classification).find((t) => t.label === typeLabel);
  return match?.code ?? "";
}

export function classificationNeedsType(classification: PropertyClassification): boolean {
  return classification === "semi_expendable" || classification === "consumable";
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
    classification === "semi_expendable" ? "Semi-Expendable Type" : "Consumable Type";
  if (!type.trim()) return { type: `${label} is required.` };
  const expected = codeForType(classification, type);
  if (!expected) return { type: `Select a valid ${label}.` };
  if (code !== expected) return { code: `Code must be ${expected} for the selected type.` };
  return {};
}

export function classificationLabel(value: PropertyClassification): string {
  if (value === "low_value") return "Low-Value";
  if (value === "high_value") return "High-Value";
  if (value === "semi_expendable") return "Semi-Expendable";
  return "Consumable";
}
