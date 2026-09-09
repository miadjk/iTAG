import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import path from "path";
import { fillAvrWorksheet, normalizeAvrPayload } from "@/lib/fill-avr-template";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const { header, items } = normalizeAvrPayload(body);

  if (!items.length) {
    return NextResponse.json({ error: "No inventory items to export." }, { status: 400 });
  }

  const missing = items.find((item) => !String(item.description ?? "").trim());
  if (missing || !String(header.entityName ?? "").trim() || !String(header.icsNumber ?? "").trim()) {
    return NextResponse.json(
      { error: "Entity, ICS No., and each item description are required." },
      { status: 400 },
    );
  }

  const templatePath = path.join(process.cwd(), "public", "templates", "AVR.xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return NextResponse.json({ error: "Excel template is missing a worksheet." }, { status: 500 });
  }

  fillAvrWorksheet(sheet, header, items);

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${header.icsNumber || "AVR"}.xlsx`;
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
