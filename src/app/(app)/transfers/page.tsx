"use client";

import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useApp } from "@/lib/app-context";
import { formatDate } from "@/lib/utils";

export default function TransfersPage() {
  const { state, schoolProperties } = useApp();
  const ids = new Set(schoolProperties.map((p) => p.id));
  const rows = state.transfers.filter((t) => ids.has(t.propertyId));

  return (
    <div>
      <PageHeader
        kicker="Movement"
        title="Transfers"
        description="Transfers update the current accountable person without deleting the previous custodian."
      />
      {rows.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="No transfers yet." body="Open a property record to transfer it to a new accountable person, office, and location." />
      ) : (
        <div className="space-y-3">
          {rows.map((t) => {
            const p = schoolProperties.find((x) => x.id === t.propertyId);
            return (
              <article key={t.id} className="surface p-4 text-sm">
                <Link href={`/properties/${t.propertyId}`} className="text-[#F1E5A1]">
                  {p?.inventoryItemNumber}
                </Link>
                <p className="mt-2">
                  {t.previousAccountablePerson} → {t.newAccountablePerson}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {t.previousLocation} → {t.newLocation} · {formatDate(t.date)} · {t.reason}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
