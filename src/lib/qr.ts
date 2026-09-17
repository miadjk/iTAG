import { formatLongDate, formatMoney } from "@/lib/utils";
import { propertyPublicUrl } from "@/lib/site";
import { classificationLabel, classificationNeedsType } from "@/lib/property-types";
import type { PropertyClassification, PropertyRecord, PropertyStatus } from "@/types";

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
  permanentId?: string;
  qrVersion?: number;
  classification?: PropertyClassification;
  type?: string;
  code?: string;
  location?: string;
  currentAccountablePerson?: string;
  status?: PropertyStatus;
  updatedAt?: string;
};

export function statusLabel(status?: string) {
  if (!status) return "";
  return status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Fields that live inside the QR — changes to these bump qrVersion. */
export function qrEncodedSnapshot(property: {
  description: string;
  classification: PropertyClassification | string;
  type?: string;
  code?: string;
  inventoryItemNumber: string;
  icsNumber: string;
  unitCost: number;
  totalCost: number;
  fundSource: string;
  location: string;
  currentAccountablePerson: string;
  custodianLastUser: string;
  status: string;
  dateAcquired: string;
  quantity: number;
  unitOfMeasure: string;
}): string {
  return JSON.stringify({
    description: property.description.trim(),
    classification: property.classification,
    type: (property.type || "").trim(),
    code: (property.code || "").trim(),
    inventoryItemNumber: property.inventoryItemNumber.trim(),
    icsNumber: property.icsNumber.trim(),
    unitCost: Number(property.unitCost) || 0,
    totalCost: Number(property.totalCost) || 0,
    fundSource: property.fundSource.trim(),
    location: property.location.trim(),
    currentAccountablePerson: (property.currentAccountablePerson || property.custodianLastUser || "").trim(),
    status: property.status,
    dateAcquired: property.dateAcquired || "",
    quantity: Number(property.quantity) || 0,
    unitOfMeasure: (property.unitOfMeasure || "").trim(),
  });
}

export function encodedQrFieldsChanged(
  before: Parameters<typeof qrEncodedSnapshot>[0],
  after: Parameters<typeof qrEncodedSnapshot>[0],
) {
  return qrEncodedSnapshot(before) !== qrEncodedSnapshot(after);
}

function line(label: string, value: string) {
  const v = value.trim();
  return v ? `${label}: ${v}` : "";
}

/**
 * Self-contained human-readable QR text for offline phone scanners.
 * No nested URL — scanners show this text directly without needing internet.
 */
export function propertyQrPayload(property: {
  permanentId?: string;
  qrVersion?: number;
  description: string;
  classification?: PropertyClassification | string;
  inventoryItemNumber?: string;
  icsNumber?: string;
  unitCost?: number;
  totalCost?: number;
  fundSource?: string;
  location?: string;
  currentAccountablePerson?: string;
  custodianLastUser?: string;
  status?: string;
  dateAcquired?: string;
  updatedAt?: string;
}): string {
  const propertyId = (property.permanentId || "").trim() || property.inventoryItemNumber || "UNKNOWN";
  const version = property.qrVersion && property.qrVersion > 0 ? property.qrVersion : 1;
  const value = Number(property.totalCost ?? property.unitCost ?? 0) || 0;
  const acquired = formatLongDate(property.dateAcquired) || property.dateAcquired || "";
  const updated = formatLongDate(property.updatedAt) || (property.updatedAt || "").slice(0, 10);

  const lines = [
    "ITAG-PROP",
    line("PROPERTY ID", propertyId),
    line("QR VERSION", String(version)),
    "",
    line("PROPERTY NAME", property.description || ""),
    line(
      "CATEGORY",
      property.classification ? classificationLabel(property.classification as PropertyClassification) : "",
    ),
    line("ITEM NO.", property.inventoryItemNumber || ""),
    line("ICS NO.", property.icsNumber || ""),
    line("VALUE", formatMoney(value)),
    line("FUNDING SOURCE", property.fundSource || ""),
    line("SCHOOL", property.location || ""),
    line("ACCOUNTABLE PERSON", property.currentAccountablePerson || property.custodianLastUser || ""),
    line("STATUS", statusLabel(property.status)),
    line("DATE ACQUIRED", acquired),
    line("LAST UPDATED", updated),
  ];

  return lines.filter((l, i) => l !== "" || lines[i - 1] !== "").join("\n").trim();
}

/** Online deep-link for in-app use only — never encoded inside the offline QR text. */
export function propertyOnlineResultUrl(qrToken?: string) {
  if (!qrToken?.trim()) return "";
  return propertyPublicUrl(qrToken.trim());
}

export function propertyScanLines(property: QrPropertyView) {
  const lines: [string, string][] = [
    ["Entity", property.entityName],
    ["ICSNO.", property.icsNumber],
    ["Item No.", property.inventoryItemNumber],
    ["Description", property.description],
  ];
  if (property.permanentId) {
    lines.unshift(["Property ID", property.permanentId]);
  }
  if (property.qrVersion) {
    lines.splice(1, 0, ["QR Version", String(property.qrVersion)]);
  }
  if (property.classification) {
    lines.push(["Classification", classificationLabel(property.classification)]);
    if (classificationNeedsType(property.classification)) {
      if (property.type) lines.push(["Type", property.type]);
      if (property.code) lines.push(["Code", property.code]);
    }
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
  if (property.location) lines.push(["School / Location", property.location]);
  if (property.currentAccountablePerson) lines.push(["Accountable Person", property.currentAccountablePerson]);
  if (property.status) lines.push(["Status", statusLabel(property.status)]);
  return lines;
}

export type { PropertyRecord };
