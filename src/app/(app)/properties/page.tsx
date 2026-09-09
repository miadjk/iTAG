"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Eye, Package, Pencil, QrCode, ScanLine } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QrCard } from "@/components/qr-card";
import { PropertyScanner } from "@/components/property-scanner";
import { useApp } from "@/lib/app-context";
import { downloadPropertyExcel } from "@/lib/files";

function PropertiesContent() {
  const { schoolProperties, can } = useApp();
  const search = useSearchParams();
  const router = useRouter();
  const scanning = search.get("scan") === "1";
  const [qrId, setQrId] = useState<string | null>(null);
  const qrProperty = schoolProperties.find((p) => p.id === qrId);

  return (
    <div>
      <PageHeader
        kicker="Inventory"
        title={can("encode") ? "My properties" : "Property records"}
        description="Each saved property has a unique QR code and a filled Excel template."
        actions={
          <div className="flex flex-wrap gap-2">
            {can("encode") ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push(scanning ? "/properties" : "/properties?scan=1")}
              >
                <ScanLine className="h-4 w-4" /> {scanning ? "Close scan" : "Scan QR"}
              </Button>
            ) : null}
            {can("encode") ? (
              <Link href="/properties/new">
                <Button>Add property</Button>
              </Link>
            ) : null}
          </div>
        }
      />

      {scanning ? (
        <div className="mb-8">
          <h2 className="font-display mb-4 text-3xl">Scan result</h2>
          <PropertyScanner onClose={() => router.push("/properties")} />
        </div>
      ) : null}

      {schoolProperties.length === 0 && !scanning ? (
        <EmptyState
          icon={Package}
          title="No properties yet."
          body="Add a property to generate its QR code and Excel template."
          action={
            can("encode") ? (
              <Link href="/properties/new">
                <Button>Add first property</Button>
              </Link>
            ) : null
          }
        />
      ) : null}

      {schoolProperties.length > 0 && !scanning ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[720px] w-full border border-[var(--border)] text-left text-sm">
              <thead className="bg-[var(--bg-muted)] text-[11px] uppercase tracking-widest text-[var(--text-muted)]">
                <tr>
                  <th className="p-3">Item</th>
                  <th className="p-3">QR</th>
                  <th className="p-3">Excel template</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schoolProperties.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--border)]">
                    <td className="p-3 text-[var(--text)]">{p.description}</td>
                    <td className="p-3">
                      <button type="button" className="inline-flex items-center gap-2 text-[#8a7310] dark:text-[#F1E5A1]" onClick={() => setQrId(p.id)}>
                        <QrCode className="h-4 w-4" /> View QR
                      </button>
                    </td>
                    <td className="p-3">
                      <button type="button" className="inline-flex items-center gap-2 text-[#8a7310] dark:text-[#F1E5A1]" onClick={() => downloadPropertyExcel(p, schoolProperties)}>
                        <Download className="h-4 w-4" /> Download Excel
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/properties/${p.id}`} className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--text)]">
                          <Eye className="h-3.5 w-3.5" /> View
                        </Link>
                        {can("encode") ? (
                          <Link href={`/properties/${p.id}?edit=1`} className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--text)]">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Link>
                        ) : null}
                        <Link href={`/properties/${p.id}`} className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[var(--text)]">
                          Print
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {schoolProperties.map((p) => (
              <article key={p.id} className="surface p-4">
                <p className="text-sm text-[var(--text)]">{p.description}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{p.inventoryItemNumber || p.propertyNumber}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setQrId(p.id)}>
                    View QR
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => downloadPropertyExcel(p, schoolProperties)}>
                    Download Excel
                  </Button>
                  <Link href={`/properties/${p.id}`}>
                    <Button type="button" variant="secondary">
                      View
                    </Button>
                  </Link>
                  {can("encode") ? (
                    <Link href={`/properties/${p.id}?edit=1`}>
                      <Button type="button" variant="secondary">
                        Edit
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {qrProperty ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="surface w-full max-w-sm p-5">
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

export default function PropertiesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--text-muted)]">Loading properties…</p>}>
      <PropertiesContent />
    </Suspense>
  );
}
