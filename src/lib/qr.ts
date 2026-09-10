import { formatLongDate, formatMoney } from "@/lib/utils";

export type QrPropertyView = {
  entityName: string;
  icsNumber: string;
  inventoryItemNumber: string;
  description: string;
  dateAcquired: string;
  unitOfMeasure: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  custodianLastUser: string;
  fundSource: string;
  estimatedUsefulLife: string;
  qrCode?: string;
};

export function propertyQrPayload(property: QrPropertyView) {
  return propertyScanLines(property)
    .map(([label, value]) => `${label}:${value || "—"}`)
    .join("\n");
}

export function propertyScanLines(property: QrPropertyView) {
  return [
    ["Entity", property.entityName],
    ["ICSNO.", property.icsNumber],
    ["Item No.", property.inventoryItemNumber],
    ["Description", property.description],
    ["Date Acquired", formatLongDate(property.dateAcquired) || property.dateAcquired],
    ["Unit Measure", property.unitOfMeasure],
    ["Quantity", String(property.quantity)],
    ["Unit Cost", formatMoney(property.unitCost)],
    ["Total Cost", formatMoney(property.totalCost)],
    ["Custodian/Last User", property.custodianLastUser],
    ["Fund Source", property.fundSource],
    ["Useful Life", property.estimatedUsefulLife],
  ] as const;
}
