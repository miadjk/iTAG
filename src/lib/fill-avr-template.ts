import type ExcelJS from "exceljs";

export const AVR_ITEM_START_ROW = 14;
export const AVR_ITEM_END_ROW = 30;
export const AVR_MAX_ITEMS = AVR_ITEM_END_ROW - AVR_ITEM_START_ROW + 1;

export type AvrLineItem = {
  quantity?: number | string;
  unitOfMeasure?: string;
  unitCost?: number | string;
  totalCost?: number | string;
  description?: string;
  inventoryItemNumber?: string;
  propertyNumber?: string;
  estimatedUsefulLife?: string;
};

export type AvrHeader = {
  entityName?: string;
  icsNumber?: string;
  fundCluster?: string;
  custodianLastUser?: string;
  currentAccountablePerson?: string;
  dateAcquired?: string;
};

function asText(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function asMoney(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function displayDate(value: unknown) {
  const raw = asText(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function writeCell(sheet: ExcelJS.Worksheet, address: string, value: ExcelJS.CellValue) {
  const cell = sheet.getCell(address);
  const target = cell.isMerged ? cell.master : cell;
  target.value = value;
}

function clearInventoryRows(sheet: ExcelJS.Worksheet) {
  for (let row = AVR_ITEM_START_ROW; row <= AVR_ITEM_END_ROW; row++) {
    for (const col of ["A", "B", "C", "D", "E", "G", "H"] as const) {
      writeCell(sheet, `${col}${row}`, null);
    }
  }
}

export function fillAvrWorksheet(sheet: ExcelJS.Worksheet, header: AvrHeader, items: AvrLineItem[]) {
  const entity = asText(header.entityName);
  const ics = asText(header.icsNumber);
  const fundCluster = asText(header.fundCluster);
  const custodian = asText(header.custodianLastUser || header.currentAccountablePerson);
  const acquired = displayDate(header.dateAcquired);

  if (entity) writeCell(sheet, "A8", `Entity Name: ${entity}`);
  if (ics) writeCell(sheet, "G8", `ICS No : ${ics}`);
  if (fundCluster) {
    writeCell(sheet, "A9", `Fund Cluster : ${fundCluster}`);
  }

  writeCell(sheet, "A37", null);
  writeCell(sheet, "E37", custodian || null);
  writeCell(sheet, "A41", acquired || null);

  clearInventoryRows(sheet);

  const lines = items.slice(0, AVR_MAX_ITEMS);
  lines.forEach((item, index) => {
    const row = AVR_ITEM_START_ROW + index;
    const quantity = asMoney(item.quantity) || 0;
    const unitCost = asMoney(item.unitCost);
    const totalCost = asMoney(item.totalCost) || quantity * unitCost;
    const description = asText(item.description);
    const itemNo = asText(item.inventoryItemNumber || item.propertyNumber);
    const unit = asText(item.unitOfMeasure) || "Unit";
    const life = asText(item.estimatedUsefulLife);

    writeCell(sheet, `A${row}`, quantity);
    writeCell(sheet, `B${row}`, unit);
    writeCell(sheet, `C${row}`, unitCost);
    writeCell(sheet, `D${row}`, totalCost);
    writeCell(sheet, `E${row}`, description);
    writeCell(sheet, `G${row}`, itemNo);
    writeCell(sheet, `H${row}`, life);
  });
}

export function normalizeAvrPayload(body: unknown): { header: AvrHeader; items: AvrLineItem[] } {
  const data = (body ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(data.items) ? data.items : [data];
  const items = rawItems.filter(Boolean) as AvrLineItem[];
  const first = (items[0] ?? data) as AvrHeader & AvrLineItem;
  return {
    header: {
      entityName: asText(data.entityName) || first.entityName,
      icsNumber: asText(data.icsNumber) || first.icsNumber,
      fundCluster: asText(data.fundCluster) || first.fundCluster,
      custodianLastUser: asText(data.custodianLastUser) || first.custodianLastUser,
      currentAccountablePerson: asText(data.currentAccountablePerson) || first.currentAccountablePerson,
      dateAcquired: asText(data.dateAcquired) || first.dateAcquired,
    },
    items,
  };
}
