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
  receivedFromName?: string;
  receivedFromPosition?: string;
  receivedByName?: string;
  receivedByPosition?: string;
};

function asText(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

const WORKSHEET_NAME_FALLBACK = "Inventory Custodian Slip";
const WORKSHEET_NAME_MAX = 31;
const TITLE_CASE_SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "in",
  "nor",
  "of",
  "on",
  "or",
  "the",
  "to",
  "vs",
  "via",
]);

/** Title-case words for the worksheet tab only (does not change stored Description). */
function titleCaseWords(value: string) {
  const words = value.split(/\s+/).filter(Boolean);
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && index < words.length - 1 && TITLE_CASE_SMALL_WORDS.has(lower)) {
        return lower;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Build a valid Excel worksheet/tab name from a property description.
 * Removes \ / ? * [ ], trims, title-cases, caps at 31 chars, and avoids collisions.
 */
export function worksheetNameFromDescription(
  description: string | undefined | null,
  existingNames: Iterable<string> = [],
) {
  let base = titleCaseWords(asText(description))
    .replace(/[\\/?*[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) base = WORKSHEET_NAME_FALLBACK;
  base = base.slice(0, WORKSHEET_NAME_MAX).trim();
  if (!base) base = WORKSHEET_NAME_FALLBACK.slice(0, WORKSHEET_NAME_MAX);

  const used = new Set(
    [...existingNames]
      .map((n) => asText(n).toLowerCase())
      .filter(Boolean),
  );

  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${n})`;
    candidate = `${base.slice(0, Math.max(1, WORKSHEET_NAME_MAX - suffix.length)).trimEnd()}${suffix}`;
    n += 1;
  }
  return candidate;
}

/** Rename a worksheet tab from the saved item description (sanitized for Excel). */
export function renameWorksheetFromDescription(
  sheet: ExcelJS.Worksheet,
  description: string | undefined | null,
) {
  const workbook = sheet.workbook;
  const others = workbook.worksheets.filter((s) => s.id !== sheet.id).map((s) => s.name);
  sheet.name = worksheetNameFromDescription(description, others);
  return sheet.name;
}

function asMoney(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function displayDate(value: unknown) {
  const raw = asText(value);
  if (!raw) return "";
  const date = new Date(raw.includes("T") ? raw : `${raw}T00:00:00`);
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
  const receivedFromName = asText(header.receivedFromName);
  const receivedFromPosition = asText(header.receivedFromPosition);
  const receivedByName = asText(header.receivedByName) || custodian;
  const receivedByPosition = asText(header.receivedByPosition);

  if (entity) writeCell(sheet, "A8", `Entity Name: ${entity}`);
  if (ics) writeCell(sheet, "G8", `ICS No : ${ics}`);
  if (fundCluster) {
    writeCell(sheet, "A9", `Fund Cluster : ${fundCluster}`);
  }

  writeCell(sheet, "A37", receivedFromName || null);
  writeCell(sheet, "A38", receivedFromPosition || null);
  writeCell(sheet, "E37", receivedByName || null);
  writeCell(sheet, "E38", receivedByPosition || null);

  // Received from / Received by: date value in row 39, "Date" label in row 40.
  // Clear old position/office text and the previous static date / label rows.
  writeCell(sheet, "A39", acquired || null);
  writeCell(sheet, "A40", "Date");
  writeCell(sheet, "E39", acquired || null);
  writeCell(sheet, "E40", "Date");
  writeCell(sheet, "A41", null);
  writeCell(sheet, "E41", null);
  writeCell(sheet, "A42", null);
  writeCell(sheet, "E42", null);

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
      receivedFromName: asText(data.receivedFromName) || first.receivedFromName,
      receivedFromPosition: asText(data.receivedFromPosition) || first.receivedFromPosition,
      receivedByName: asText(data.receivedByName) || first.receivedByName,
      receivedByPosition: asText(data.receivedByPosition) || first.receivedByPosition,
    },
    items,
  };
}
