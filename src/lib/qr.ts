import { formatLongDate, formatMoney } from "@/lib/utils";
import { propertyPublicUrl } from "@/lib/site";
import { classificationLabel } from "@/lib/property-types";
import type { PropertyClassification } from "@/types";

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
  classification?: PropertyClassification;
  type?: string;
  code?: string;
};

export function propertyQrPayload(token: string) {
  return propertyPublicUrl(token);
}

export function propertyScanLines(property: QrPropertyView) {
  const lines: [string, string][] = [
    ["Entity", property.entityName],
    ["ICSNO.", property.icsNumber],
    ["Item No.", property.inventoryItemNumber],
    ["Description", property.description],
  ];
  if (property.classification) {
    lines.push(["Classification", classificationLabel(property.classification)]);
  }
  if (property.type) {
    lines.push(["Type", property.type]);
  }
  if (property.code) {
    lines.push(["Code", property.code]);
  }
  lines.push(
    ["Date Acquired", formatLongDate(property.dateAcquired) || property.dateAcquired],
    ["Unit Measure", property.unitOfMeasure],
    ["Quantity", String(property.quantity)],
    ["Unit Cost", formatMoney(property.unitCost)],
    ["Total Cost", formatMoney(property.totalCost)],
    ["Custodian/Last User", property.custodianLastUser],
    ["Fund Source", property.fundSource],
    ["Useful Life", property.estimatedUsefulLife],
  );
  return lines;
}
