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

/** Compact self-contained QR payload — readable offline without network/API. */
export type PropertyQrPayload = {
  type: "ITAG-PROP";
  propertyId: string;
  qrVersion: number;
  propertyName: string;
  category: string;
  itemNo: string;
  icsNo: string;
  value: number;
  fundingSource: string;
  school: string;
  accountablePerson: string;
  status: string;
  dateAcquired: string;
  updatedAt: string;
  /** Optional online deep-link; never required to read property data offline. */
  url?: string;
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

/**
 * Build a self-contained QR string from FINAL SAVED property data.
 * Phone cameras decode this JSON offline without opening any website.
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
  qrCode?: string;
  updatedAt?: string;
  includeOnlineUrl?: boolean;
}): string {
  const propertyId = (property.permanentId || "").trim() || property.inventoryItemNumber || "UNKNOWN";
  const payload: PropertyQrPayload = {
    type: "ITAG-PROP",
    propertyId,
    qrVersion: property.qrVersion && property.qrVersion > 0 ? property.qrVersion : 1,
    propertyName: property.description || "",
    category: property.classification ? classificationLabel(property.classification as PropertyClassification) : "",
    itemNo: property.inventoryItemNumber || "",
    icsNo: property.icsNumber || "",
    value: Number(property.totalCost ?? property.unitCost ?? 0) || 0,
    fundingSource: property.fundSource || "",
    school: property.location || "",
    accountablePerson: property.currentAccountablePerson || property.custodianLastUser || "",
    status: statusLabel(property.status),
    dateAcquired: property.dateAcquired || "",
    updatedAt: (property.updatedAt || "").slice(0, 10),
  };
  if (property.includeOnlineUrl !== false && property.qrCode) {
    payload.url = propertyPublicUrl(property.qrCode);
  }
  return JSON.stringify(payload);
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
