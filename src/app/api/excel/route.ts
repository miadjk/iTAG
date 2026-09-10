import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import path from "path";
import { fillAvrWorksheet } from "@/lib/fill-avr-template";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapProperty } from "@/lib/mappers";
import { normalizeKey } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { icsNumber?: string; propertyId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const profile = await supabase.from("profiles").select("school_id, active").eq("id", user.id).maybeSingle();
  if (!profile.data?.active || !profile.data.school_id) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const propertiesRes = await supabase
    .from("properties")
    .select("*")
    .eq("school_id", profile.data.school_id)
    .order("inventory_item_number");
  if (propertiesRes.error) {
    return NextResponse.json({ error: propertiesRes.error.message }, { status: 400 });
  }

  const all = (propertiesRes.data ?? []).map(mapProperty);
  let ics = normalizeKey(body.icsNumber || "");
  if (!ics && body.propertyId) {
    ics = normalizeKey(all.find((p) => p.id === body.propertyId)?.icsNumber || "");
  }
  const items = all.filter((p) => normalizeKey(p.icsNumber).toLowerCase() === ics.toLowerCase());
  if (!ics || !items.length) {
    return NextResponse.json({ error: "No properties found for that ICSNO." }, { status: 404 });
  }

  const header = items[0];
  const templatePath = path.join(process.cwd(), "public", "templates", "AVR.xlsx");
  const workbook = new ExcelJS.Workbook();
  let usedTemplate = false;
  try {
    await workbook.xlsx.readFile(templatePath);
    usedTemplate = Boolean(workbook.worksheets[0]);
  } catch {
    usedTemplate = false;
  }

  if (usedTemplate && workbook.worksheets[0]) {
    fillAvrWorksheet(
      workbook.worksheets[0],
      {
        entityName: header.entityName,
        icsNumber: header.icsNumber,
        fundCluster: header.fundCluster,
        custodianLastUser: header.custodianLastUser,
        currentAccountablePerson: header.currentAccountablePerson,
        dateAcquired: header.dateAcquired,
      },
      items,
    );
  } else {
    const sheet = workbook.addWorksheet("ICSNO");
    sheet.columns = [
      { header: "Item No.", key: "item", width: 18 },
      { header: "Description", key: "description", width: 36 },
      { header: "Quantity", key: "quantity", width: 12 },
      { header: "Unit", key: "unit", width: 12 },
      { header: "Unit Cost", key: "unitCost", width: 14 },
      { header: "Total Cost", key: "totalCost", width: 14 },
      { header: "Custodian", key: "custodian", width: 24 },
      { header: "Useful Life", key: "life", width: 16 },
    ];
    items.forEach((item) => {
      sheet.addRow({
        item: item.inventoryItemNumber,
        description: item.description,
        quantity: item.quantity,
        unit: item.unitOfMeasure,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
        custodian: item.custodianLastUser,
        life: item.estimatedUsefulLife,
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${header.icsNumber.replace(/[^\w.-]+/g, "_") || "ICSNO."}.xlsx`;
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
