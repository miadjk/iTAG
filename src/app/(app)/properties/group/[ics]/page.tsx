"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download, Eye, Pencil, QrCode } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { QrCard } from "@/components/qr-card";
import { ScanResult } from "@/components/scan-result";
import { useApp } from "@/lib/app-context";
import { downloadIcsExcel } from "@/lib/files";
import { normalizeKey } from "@/lib/utils";

export default function IcsGroupPage() {
  const params = useParams<{ ics: string }>();
  const { schoolProperties, can } = useApp();
  const ics = decodeURIComponent(params.ics || "");
  const items = useMemo(
    () =>
      schoolProperties
        .filter((p) => normalizeKey(p.icsNumber).toLowerCase() === normalizeKey(ics).toLowerCase())
        .slice()
        .sort((a, b) => a.inventoryItemNumber.localeCompare(b.inventoryItemNumber)),
    [schoolProperties, ics],
  );
  const [qrId, setQrId] = useState<string | null>(null);
  const [excelError, setExcelError] = useState("");
  const qrProperty = items.find((p) => p.id === qrId);

  if (!items.length) {
    return <p className="text-sm text-[var(--text-muted)]">No properties found for ICSNO. {ics}.</p>;
  }

  return (
    <div>
      <PageHeader
        kicker="ICSNO. group"
        title={items[0].icsNumber}
        description={`${items.length} properties in this group. Each item has its own QR code.`}
        actions={
          <div className="flex flex-wrap gap-2">
            {can("encode") ? (
              <Link href="/properties/new">
                <Button type="button" variant="secondary">
                  Add item to group
                </Button>
              </Link>
            ) : null}
            <Button
              type="button"
              onClick={async () => {
                setExcelError("");
                try {
                  await downloadIcsExcel(items[0].icsNumber);
                } catch (err) {
                  setExcelError(err instanceof Error ? err.message : "Unable to download Excel.");
                }
              }}
            >
              <Download className="h-4 w-4" /> Excel
            </Button>
          </div>
        }
      />
      {excelError ? <p className="mb-4 break-words text-sm text-red-700">{excelError}</p> : null}

      <div className="space-y-4 sm:space-y-6">
        {items.map((property) => (
          <article key={property.id} className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
            <ScanResult property={property} title={property.inventoryItemNumber} />
            <div className="surface h-fit p-4">
              <div className="flex flex-wrap gap-2">
                <Link href={`/properties/${property.id}`}>
                  <Button type="button" variant="secondary">
                    <Eye className="h-4 w-4" /> View
                  </Button>
                </Link>
                {can("encode") ? (
                  <Link href={`/properties/${property.id}?edit=1`}>
                    <Button type="button" variant="secondary">
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                  </Link>
                ) : null}
                <Button type="button" variant="secondary" onClick={() => setQrId(property.id)}>
                  <QrCode className="h-4 w-4" /> QR
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {qrProperty ? (
        <div className="modal-overlay" onClick={() => setQrId(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <QrCard property={qrProperty} />
            <Button type="button" variant="secondary" className="mt-4 w-full" onClick={() => setQrId(null)}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
