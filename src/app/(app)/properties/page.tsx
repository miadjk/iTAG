"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye, Package, Pencil, QrCode, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { QrCard } from "@/components/qr-card";
import { useApp } from "@/lib/app-context";
import { downloadIcsExcel } from "@/lib/files";
import { groupByIcs, searchProperties } from "@/lib/search";

export default function PropertiesPage() {
  const { schoolProperties, can } = useApp();
  const [query, setQuery] = useState("");
  const [qrId, setQrId] = useState<string | null>(null);
  const [excelError, setExcelError] = useState("");
  const qrProperty = schoolProperties.find((p) => p.id === qrId);
  const groups = useMemo(() => groupByIcs(schoolProperties), [schoolProperties]);
  const result = useMemo(() => searchProperties(schoolProperties, query), [schoolProperties, query]);

  async function downloadGroup(ics: string) {
    setExcelError("");
    try {
      await downloadIcsExcel(ics);
    } catch (err) {
      setExcelError(err instanceof Error ? err.message : "Unable to download Excel.");
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Inventory"
        title={can("encode") ? "My properties" : "Property records"}
        description="Search by Item No. for one property, or ICSNO. for the whole group. Each item has its own QR code."
        actions={
          can("encode") ? (
            <Link href="/properties/new">
              <Button>Add property</Button>
            </Link>
          ) : null
        }
      />

      <form
        className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <Field label="Search Item No. or ICSNO.">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Item No. or ICSNO."
          />
        </Field>
        <div className="flex items-end">
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4" /> Search
          </Button>
        </div>
      </form>
      {excelError ? <p className="mb-4 text-sm text-red-600">{excelError}</p> : null}

      {query.trim() ? (
        <SearchResults result={result} canEncode={can("encode")} onQr={setQrId} onExcel={downloadGroup} />
      ) : schoolProperties.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No properties yet."
          body="Add a property to generate its QR code and Excel file."
          action={
            can("encode") ? (
              <Link href="/properties/new">
                <Button>Add first property</Button>
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <article key={group.icsNumber} className="surface p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">ICSNO.</p>
                  <h2 className="font-display text-3xl">{group.icsNumber}</h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {group.properties.length} item{group.properties.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/properties/group/${encodeURIComponent(group.icsNumber)}`}>
                    <Button type="button" variant="secondary">
                      Open group
                    </Button>
                  </Link>
                  <Button type="button" variant="secondary" onClick={() => downloadGroup(group.icsNumber)}>
                    <Download className="h-4 w-4" /> Excel
                  </Button>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {group.properties.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-2">
                    <span>
                      <span className="text-[var(--text-muted)]">{p.inventoryItemNumber}</span>
                      <span className="mx-2">·</span>
                      {p.description}
                    </span>
                    <span className="flex gap-3">
                      <button type="button" className="inline-flex items-center gap-1 text-xs uppercase tracking-widest" onClick={() => setQrId(p.id)}>
                        <QrCode className="h-3.5 w-3.5" /> QR
                      </button>
                      <Link href={`/properties/${p.id}`} className="inline-flex items-center gap-1 text-xs uppercase tracking-widest">
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

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

function SearchResults({
  result,
  canEncode,
  onQr,
  onExcel,
}: {
  result: ReturnType<typeof searchProperties>;
  canEncode: boolean;
  onQr: (id: string) => void;
  onExcel: (ics: string) => void;
}) {
  if (result.kind === "empty") return null;
  if (result.kind === "none") {
    return <p className="text-sm text-[var(--text-muted)]">No property or ICSNO. matched “{result.query}”.</p>;
  }
  if (result.kind === "item") {
    const p = result.property;
    return (
      <article className="surface p-5">
        <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">Item No.</p>
        <h2 className="font-display text-3xl">{p.inventoryItemNumber}</h2>
        <p className="mt-2 text-sm">{p.description}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">ICSNO. {p.icsNumber}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/properties/${p.id}`}>
            <Button type="button" variant="secondary">
              <Eye className="h-4 w-4" /> View
            </Button>
          </Link>
          {canEncode ? (
            <Link href={`/properties/${p.id}?edit=1`}>
              <Button type="button" variant="secondary">
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            </Link>
          ) : null}
          <Button type="button" variant="secondary" onClick={() => onQr(p.id)}>
            <QrCode className="h-4 w-4" /> QR
          </Button>
          <Link href={`/properties/group/${encodeURIComponent(p.icsNumber)}`}>
            <Button type="button" variant="secondary">
              Open ICSNO. group
            </Button>
          </Link>
        </div>
      </article>
    );
  }
  if (result.kind === "group") {
    return (
      <article className="surface p-5">
        <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">ICSNO. group</p>
        <h2 className="font-display text-3xl">{result.icsNumber}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{result.properties.length} items</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/properties/group/${encodeURIComponent(result.icsNumber)}`}>
            <Button>Open group</Button>
          </Link>
          <Button type="button" variant="secondary" onClick={() => onExcel(result.icsNumber)}>
            <Download className="h-4 w-4" /> Excel
          </Button>
        </div>
      </article>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-muted)]">Multiple matches for “{result.query}”.</p>
      {result.items.map((p) => (
        <Link key={p.id} href={`/properties/${p.id}`} className="surface block p-4 text-sm">
          Item No. {p.inventoryItemNumber} · {p.description}
        </Link>
      ))}
      {result.groups.map((g) => (
        <Link key={g.icsNumber} href={`/properties/group/${encodeURIComponent(g.icsNumber)}`} className="surface block p-4 text-sm">
          ICSNO. {g.icsNumber} · {g.properties.length} items
        </Link>
      ))}
    </div>
  );
}
