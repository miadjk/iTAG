"use client";

import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";
import { classLabel, conditionBadge, propertyStatusBadge, supplyStatusBadge } from "@/components/badges";
import { Field, Select } from "@/components/ui/field";
import { formatLongDate } from "@/lib/utils";
import type { PropertyRecord } from "@/types";

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

type ReportType = (typeof REPORTS)[number];

function propertyRows(report: ReportType, properties: PropertyRecord[]) {
  switch (report) {
    case "Low-Value Properties":
      return properties.filter((p) => p.classification === "low_value");
    case "High-Value Properties":
      return properties.filter((p) => p.classification === "high_value");
    default:
      return properties;
  }
}

export default function ReportsPage() {
  const { schoolProperties, schoolSupplies, state, saveReport, user } = useApp();
  const [report, setReport] = useState<ReportType>("Complete Property Inventory");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const content = useMemo(() => {
    if (report === "Low-Value Properties") return schoolProperties.filter((p) => p.classification === "low_value");
    if (report === "High-Value Properties") return schoolProperties.filter((p) => p.classification === "high_value");
    if (report === "Low-Stock Report") return schoolSupplies.filter((s) => s.status !== "available");
    if (report === "Current Supplies") return schoolSupplies;
    return schoolProperties;
  }, [report, schoolProperties, schoolSupplies]);

  function downloadPdf() {
    const doc = new jsPDF({ orientation: "landscape" });
    const school = user?.schoolName || user?.schoolId || "";
    const date = formatLongDate(new Date().toISOString());
    doc.setFontSize(14);
    doc.text(`${school} — ${report}`, 14, 14);
    doc.setFontSize(9);
    doc.text(`Generated on ${date}`, 14, 20);

    if (report.includes("Stock-In") || report.includes("Stock-Out")) {
      const rows = state.stockTransactions
        .filter((t) => (report.includes("Stock-In") ? t.type === "in" : t.type === "out"))
        .map((t) => [t.type.toUpperCase(), String(t.quantity), t.date, t.reference || "—"]);
      autoTable(doc, {
        head: [["Type", "Quantity", "Date", "Reference"]],
        body: rows,
        startY: 24,
      });
    } else if (report === "Property Transfer History") {
      const rows = state.transfers.map((t) => [
        t.previousAccountablePerson || "—",
        t.newAccountablePerson,
        t.reason,
        t.date || "—",
      ]);
      autoTable(doc, {
        head: [["From", "To", "Reason", "Date"]],
        body: rows,
        startY: 24,
      });
    } else if (report === "Custodian History") {
      const rows = state.propertyHistory
        .filter((h) => h.action === "assigned" || h.action === "transferred")
        .map((h) => [h.summary, formatLongDate(h.createdAt)]);
      autoTable(doc, {
        head: [["Summary", "Date"]],
        body: rows,
        startY: 24,
      });
    } else if (report.includes("Supplies") || report.includes("Low-Stock")) {
      const rows = (content as typeof schoolSupplies).map((s) => [
        s.name,
        String(s.currentQuantity),
        s.unit,
        s.status.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
      ]);
      autoTable(doc, {
        head: [["Supply", "Quantity", "Unit", "Status"]],
        body: rows,
        startY: 24,
      });
    } else {
      const rows = propertyRows(report, schoolProperties).map((p) => [
        p.icsNumber,
        p.inventoryItemNumber,
        p.entityName,
        classLabel(p.classification),
        p.currentAccountablePerson || "—",
        p.location || "—",
        p.condition.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
        p.status.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
      ]);
      autoTable(doc, {
        head: [["ICSNO.", "Item No.", "Entity", "Class", "Accountable", "Location", "Condition", "Status"]],
        body: rows,
        startY: 24,
      });
    }

    const safe = report.replace(/[^\w.-]+/g, "_");
    doc.save(`${safe}.pdf`);
  }

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
              setError("");
              try {
                await saveReport(report);
                downloadPdf();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Unable to save report.");
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
          <Select value={report} onChange={(e) => setReport(e.target.value as ReportType)}>
            {REPORTS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
      </div>

      {error ? <p className="mb-4 break-words text-sm text-red-700">{error}</p> : null}

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
            <div key={s.id} className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words">{s.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {s.currentQuantity} {s.unit}
                </p>
              </div>
              {supplyStatusBadge(s.status)}
            </div>
          ))}
        </div>
      ) : (
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Property report table">
          <table className="w-full text-sm">
            <thead className="bg-[#FDF4D2] text-[11px] uppercase tracking-widest text-[var(--text-muted)]">
              <tr>
                <th className="p-3 text-left">ICSNO.</th>
                <th className="p-3 text-left">Item No.</th>
                <th className="p-3 text-left">Entity</th>
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
                  <td className="p-3">{p.icsNumber}</td>
                  <td className="p-3">{p.inventoryItemNumber}</td>
                  <td className="p-3">{p.entityName}</td>
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