const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

const START = 14;
const END = 30;

function writeCell(sheet, address, value) {
  const cell = sheet.getCell(address);
  const target = cell.isMerged ? cell.master : cell;
  target.value = value;
}

function fill(sheet, header, items) {
  writeCell(sheet, "A8", `Entity Name: ${header.entityName}`);
  writeCell(sheet, "G8", `ICS No : ${header.icsNumber}`);
  writeCell(sheet, "A9", header.fundCluster ? `Fund Cluster : ${header.fundCluster}` : sheet.getCell("A9").value);
  writeCell(sheet, "A37", null);
  writeCell(sheet, "E37", header.custodian || null);
  writeCell(sheet, "A41", header.date || null);
  for (let row = START; row <= END; row++) {
    for (const col of ["A", "B", "C", "D", "E", "G", "H"]) writeCell(sheet, `${col}${row}`, null);
  }
  items.slice(0, 17).forEach((item, i) => {
    const row = START + i;
    const qty = Number(item.quantity) || 0;
    const unitCost = Number(item.unitCost) || 0;
    writeCell(sheet, `A${row}`, qty);
    writeCell(sheet, `B${row}`, item.unit);
    writeCell(sheet, `C${row}`, unitCost);
    writeCell(sheet, `D${row}`, qty * unitCost);
    writeCell(sheet, `E${row}`, item.description);
    writeCell(sheet, `G${row}`, item.itemNo);
    writeCell(sheet, `H${row}`, item.life);
  });
}

function makeItems(n) {
  return Array.from({ length: n }, (_, i) => ({
    quantity: i + 1,
    unit: "Unit",
    unitCost: 100 + i,
    description: `Item ${i + 1}`,
    itemNo: `2026-${String(i + 1).padStart(3, "0")}`,
    life: "5 years",
  }));
}

(async () => {
  const outDir = path.join(process.cwd(), "tmp-excel-tests");
  fs.mkdirSync(outDir, { recursive: true });
  const counts = [1, 3, 10, 17];
  for (const n of counts) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(process.cwd(), "public/templates/AVR.xlsx"));
    const sheet = wb.worksheets[0];
    fill(
      sheet,
      {
        entityName: "Test School",
        icsNumber: `ICS-${n}`,
        fundCluster: "MOOE",
        custodian: "Test Custodian",
        date: "May 7, 2026",
      },
      makeItems(n),
    );
    const dest = path.join(outDir, `avr-${n}-items.xlsx`);
    await wb.xlsx.writeFile(dest);
    const check = new ExcelJS.Workbook();
    await check.xlsx.readFile(dest);
    const s = check.worksheets[0];
    const filled = [];
    const leftover = [];
    for (let row = START; row <= END; row++) {
      const v = s.getCell(`E${row}`).value;
      if (v) filled.push(row);
      else leftover.push(row);
    }
    const a5 = String(s.getCell("A5").value || "");
    const a2 = String(s.getCell("A2").value || "");
    const fmt = s.getCell("C14").numFmt;
    console.log(
      n,
      "filledRows",
      filled.length,
      "first",
      filled[0],
      "last",
      filled[filled.length - 1],
      "blankAfter",
      leftover[0] ?? "none",
      "header",
      a5.includes("INVENTORY"),
      "deped",
      a2.includes("Department of Education"),
      "numFmtKept",
      Boolean(fmt),
      "D14",
      s.getCell("D14").value,
    );
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
