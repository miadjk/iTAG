"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { classLabel, conditionBadge, propertyStatusBadge, supplyStatusBadge } from "@/components/badges";
import { Field, Select } from "@/components/ui/field";

const REPORTS = [
  "Complete Property Inventory",
  "Low-Value Properties",
  "High-Value Properties",
  "Properties by Location",
  "Properties by Accountable Person",
  "Properties by Condition",
  "Properties by Status",
  "Current Supplies",
  "Stock-In Report",
  "Stock-Out Report",
  "Low-Stock Report",
  "Property Transfer History",
  "Custodian History",
] as const;

export default function ReportsPage() {
  const { schoolProperties, schoolSupplies, state, saveReport } = useApp();
  const [report, setReport] = useState<(typeof REPORTS)[number]>("Complete Property Inventory");
  const [saving, setSaving] = useState(false);

  const content = useMemo(() => {
    if (report === "Low-Value Properties") return schoolProperties.filter((p) => p.classification === "low_value");
    if (report === "High-Value Properties") return schoolProperties.filter((p) => p.classification === "high_value");
    if (report === "Low-Stock Report") return schoolSupplies.filter((s) => s.status !== "available");
    if (report === "Current Supplies") return schoolSupplies;
    return schoolProperties;
  }, [report, schoolProperties, schoolSupplies]);

  return (
    <div>
      <PageHeader
        kicker="Reports"
        title="Inventory reports"
        description="Reports are generated from stored inventory data: properties, supplies, transfers, and custodian history."
        actions={
          <Button
            type="button"
            variant="secondary"
            loading={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await saveReport(report);
              } finally {
                setSaving(false);
              }
            }}
          >
            Save report record
          </Button>
        }
      />
      <div className="mb-6 max-w-lg">
        <Field label="Report type">
          <Select value={report} onChange={(e) => setReport(e.target.value as typeof report)}>
            {REPORTS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
      </div>

      {report.includes("Stock-In") || report.includes("Stock-Out") ? (
        <div className="space-y-2">
          {state.stockTransactions
            .filter((t) => (report.includes("Stock-In") ? t.type === "in" : t.type === "out"))
            .map((t) => (
              <p key={t.id} className="surface p-3 text-sm">
                {t.type.toUpperCase()} · {t.quantity} · {t.date}
              </p>
            ))}
        </div>
      ) : report === "Property Transfer History" ? (
        <div className="space-y-2">
          {state.transfers.map((t) => (
            <p key={t.id} className="surface p-3 text-sm">
              {t.previousAccountablePerson} → {t.newAccountablePerson} · {t.reason}
            </p>
          ))}
        </div>
      ) : report === "Custodian History" ? (
        <div className="space-y-2">
          {state.propertyHistory
            .filter((h) => h.action === "assigned" || h.action === "transferred")
            .map((h) => (
              <p key={h.id} className="surface p-3 text-sm">
                {h.summary}
              </p>
            ))}
        </div>
      ) : report.includes("Supplies") || report.includes("Low-Stock") ? (
        <div className="space-y-2">
          {(content as typeof schoolSupplies).map((s) => (
            <div key={s.id} className="surface flex items-center justify-between p-4">
              <div>
                <p>{s.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {s.currentQuantity} {s.unit}
                </p>
              </div>
              {supplyStatusBadge(s.status)}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full border border-[var(--border)] text-sm">
            <thead className="bg-[var(--bg-muted)] text-[11px] uppercase tracking-widest text-[var(--text-muted)]">
              <tr>
                <th className="p-3 text-left">Item No.</th>
                <th className="p-3 text-left">Class</th>
                <th className="p-3 text-left">Accountable</th>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-left">Condition</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {(content as typeof schoolProperties).map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="p-3">{p.inventoryItemNumber}</td>
                  <td className="p-3">{classLabel(p.classification)}</td>
                  <td className="p-3">{p.currentAccountablePerson}</td>
                  <td className="p-3">{p.location}</td>
                  <td className="p-3">{conditionBadge(p.condition)}</td>
                  <td className="p-3">{propertyStatusBadge(p.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
