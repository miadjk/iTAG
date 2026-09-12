import { ScanResult } from "@/components/scan-result";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { QrPropertyView } from "@/lib/qr";

export const dynamic = "force-dynamic";

function mapPublic(row: Record<string, unknown>): QrPropertyView {
  return {
    entityName: String(row.entity_name ?? ""),
    icsNumber: String(row.ics_number ?? ""),
    inventoryItemNumber: String(row.inventory_item_number ?? ""),
    description: String(row.description ?? ""),
    dateAcquired: String(row.date_acquired ?? ""),
    unitOfMeasure: String(row.unit_of_measure ?? ""),
    quantity: Number(row.quantity ?? 0),
    unitCost: Number(row.unit_cost ?? 0),
    totalCost: Number(row.total_cost ?? 0),
    custodianLastUser: String(row.custodian_last_user ?? ""),
    fundSource: String(row.fund_source ?? ""),
    estimatedUsefulLife: String(row.estimated_useful_life ?? ""),
    qrCode: String(row.qr_code ?? ""),
  };
}

export default async function PublicPropertyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const decoded = decodeURIComponent(token || "").trim();

  let property: QrPropertyView | null = null;
  if (decoded.length >= 16) {
    const client = createSupabasePublicClient();
    const { data } = await client.rpc("public_property_by_qr", { p_token: decoded });
    const row = Array.isArray(data) ? data[0] : data;
    if (row) property = mapPublic(row as Record<string, unknown>);
  }

  return (
    <main className="min-h-screen min-h-dvh bg-[#FFFFFF] px-4 py-8 text-[var(--text)] sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#3F3FA3]">iTAG</p>
        {property ? (
          <div className="mt-4">
            <ScanResult property={property} title="Scan result" />
          </div>
        ) : (
          <section className="surface mt-4 p-5">
            <h1 className="font-display text-3xl">Scan result</h1>
            <p className="mt-3 text-sm text-[var(--text-muted)]">This QR code is invalid or the property is no longer in the system.</p>
          </section>
        )}
      </div>
    </main>
  );
}
