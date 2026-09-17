"use client";

import { useMemo, useState } from "react";
import { Warehouse } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useApp } from "@/lib/app-context";
import { classLabel, supplyStatusBadge } from "@/components/badges";
import { codeForType, CONSUMABLE_TYPES, validateTypeFields } from "@/lib/property-types";
import { formatLongDate } from "@/lib/utils";
import type { PropertyClassification } from "@/types";

export default function SuppliesPage() {
  const { schoolSupplies, can, upsertSupply, stockIn, stockOut, state } = useApp();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [historySupplyId, setHistorySupplyId] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    unit: "ream",
    currentQuantity: 0,
    minimumStockLevel: 10,
    location: "",
    remarks: "",
    classification: "consumable" as PropertyClassification,
    type: "",
    code: "",
  });
  const [stock, setStock] = useState({
    supplyId: "",
    type: "in" as "in" | "out",
    quantity: 1,
    date: new Date().toISOString().slice(0, 10),
    receivedBy: "",
    position: "",
    remarks: "",
  });

  const historySupply = schoolSupplies.find((s) => s.id === historySupplyId) ?? null;
  const supplyHistory = useMemo(() => {
    const rows = state.stockTransactions
      .filter((t) => (historySupplyId ? t.supplyId === historySupplyId : true))
      .slice()
      .sort((a, b) => {
        const da = `${a.date || ""} ${a.createdAt || ""}`;
        const db = `${b.date || ""} ${b.createdAt || ""}`;
        return db.localeCompare(da);
      });
    return rows;
  }, [state.stockTransactions, historySupplyId]);

  function setConsumableType(typeLabel: string) {
    setForm((prev) => ({
      ...prev,
      type: typeLabel,
      code: codeForType(prev.classification, typeLabel),
    }));
  }

  async function onSaveSupply(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const typeErrors = validateTypeFields(form.classification, form.type, form.code);
    if (typeErrors.type || typeErrors.code) {
      setFormError(typeErrors.type || typeErrors.code || "Select a valid type.");
      return;
    }
    try {
      await upsertSupply(form);
      setOpen(false);
      setForm({
        name: "",
        description: "",
        unit: "ream",
        currentQuantity: 0,
        minimumStockLevel: 10,
        location: "",
        remarks: "",
        classification: "consumable",
        type: "",
        code: "",
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to save supply.");
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Consumable supplies"
        title="Stock levels"
        description="Track stock-in, stock-out, current quantity, low-stock status, and supply history separately from properties."
        actions={
          can("supplies") ? (
            <Button type="button" onClick={() => setOpen((v) => !v)}>
              {open ? "Close form" : "Add supply"}
            </Button>
          ) : null
        }
      />

      {can("supplies") && open ? (
        <form className="surface mb-6 grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2" onSubmit={onSaveSupply} noValidate>
          <Field label="Supply name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Unit">
            <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </Field>
          <Field label="Classification">
            <Select
              value={form.classification}
              onChange={(e) =>
                setForm({
                  ...form,
                  classification: e.target.value as PropertyClassification,
                  type: "",
                  code: "",
                })
              }
            >
              <option value="consumable">Consumable</option>
            </Select>
          </Field>
          {form.classification === "consumable" ? (
            <Field label="Consumable Type">
              <Select value={form.type} onChange={(e) => setConsumableType(e.target.value)}>
                <option value="">Select type</option>
                {CONSUMABLE_TYPES.map((t) => (
                  <option key={t.code + t.label} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {form.classification === "consumable" ? (
            <Field label="Code">
              <Input readOnly value={form.code} placeholder="Auto-generated" />
            </Field>
          ) : null}
          <Field label="Current quantity">
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={form.currentQuantity || ""}
              onChange={(e) => setForm({ ...form, currentQuantity: e.target.value === "" ? 0 : Number(e.target.value) })}
            />
          </Field>
          <Field label="Minimum stock level">
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={form.minimumStockLevel || ""}
              onChange={(e) => setForm({ ...form, minimumStockLevel: e.target.value === "" ? 0 : Number(e.target.value) })}
            />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="Description">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Remarks">
              <Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </Field>
          </div>
          {formError ? <p className="break-words text-sm text-red-700 md:col-span-2">{formError}</p> : null}
          <Button type="submit" className="w-full sm:w-auto md:col-span-2 md:justify-self-start">Save supply</Button>
        </form>
      ) : null}

      {schoolSupplies.length === 0 ? (
        <EmptyState icon={Warehouse} title="No supplies yet." body="Bond paper, pens, ink, toner, and other replenished items are managed here." />
      ) : (
        <div className="space-y-3">
          {schoolSupplies.map((s) => (
            <article key={s.id} className="surface p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1 text-sm">
                  <h2 className="break-words text-sm uppercase tracking-widest">{s.name}</h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    {s.currentQuantity} {s.unit} · min {s.minimumStockLevel} · {s.location || "No location"}
                  </p>
                  {s.classification ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      Classification: {classLabel(s.classification)}
                      {s.type ? ` · Type: ${s.type}` : ""}
                      {s.code ? ` · Code: ${s.code}` : ""}
                    </p>
                  ) : null}
                  {s.description ? <p className="text-xs text-[var(--text)]">{s.description}</p> : null}
                </div>
                {supplyStatusBadge(s.status)}
              </div>
            </article>
          ))}
        </div>
      )}

      {can("supplies") && schoolSupplies.length > 0 ? (
        <form
          className="surface mt-8 grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              if (stock.type === "in") {
                await stockIn({
                  supplyId: stock.supplyId,
                  quantity: stock.quantity,
                  date: stock.date,
                  receivedBy: stock.receivedBy,
                  position: stock.position,
                  remarks: stock.remarks,
                });
              } else {
                await stockOut({
                  supplyId: stock.supplyId,
                  quantity: stock.quantity,
                  date: stock.date,
                  receivedBy: stock.receivedBy,
                  position: stock.position,
                  remarks: stock.remarks,
                });
              }
              setStock((prev) => ({ ...prev, quantity: 1, receivedBy: "", position: "", remarks: "" }));
              setHistorySupplyId(stock.supplyId);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Unable to record stock movement.");
            }
          }}
        >
          <h2 className="font-display text-2xl md:col-span-2">Stock-in / stock-out</h2>
          <Field label="Supply" required>
            <Select value={stock.supplyId} onChange={(e) => setStock({ ...stock, supplyId: e.target.value })} required>
              <option value="">Select supply</option>
              {schoolSupplies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.currentQuantity} {s.unit})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Movement">
            <Select value={stock.type} onChange={(e) => setStock({ ...stock, type: e.target.value as "in" | "out" })}>
              <option value="in">Stock-in</option>
              <option value="out">Stock-out</option>
            </Select>
          </Field>
          <Field label="Quantity" required>
            <Input type="number" min={1} value={stock.quantity} onChange={(e) => setStock({ ...stock, quantity: Number(e.target.value) })} />
          </Field>
          <Field label="Date">
            <Input type="date" value={stock.date} onChange={(e) => setStock({ ...stock, date: e.target.value })} />
          </Field>
          <Field label="Received by">
            <Input value={stock.receivedBy} onChange={(e) => setStock({ ...stock, receivedBy: e.target.value })} />
          </Field>
          <Field label="Position">
            <Input value={stock.position} onChange={(e) => setStock({ ...stock, position: e.target.value })} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Remarks / purpose">
              <Input value={stock.remarks} onChange={(e) => setStock({ ...stock, remarks: e.target.value })} />
            </Field>
          </div>
          {error ? <p className="break-words text-sm text-red-700 md:col-span-2">{error}</p> : null}
          <Button type="submit" className="w-full sm:w-auto md:col-span-2 md:justify-self-start">
            {stock.type === "in" ? "Save stock-in" : "Save stock-out"}
          </Button>
        </form>
      ) : null}

      <section className="mt-8">
        <h2 className="font-display text-2xl">Supply history</h2>
        {schoolSupplies.length > 0 ? (
          <div className="mt-4 max-w-md">
            <Field label="Filter by supply">
              <Select value={historySupplyId} onChange={(e) => setHistorySupplyId(e.target.value)}>
                <option value="">All supplies</option>
                {schoolSupplies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null}
        {historySupply ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {historySupply.name} · Current stock: {historySupply.currentQuantity} {historySupply.unit}
          </p>
        ) : null}
        <div className="mt-4 space-y-2">
          {supplyHistory.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No stock movements yet.</p>
          ) : (
            supplyHistory.slice(0, 40).map((t) => {
              const supply = schoolSupplies.find((s) => s.id === t.supplyId);
              return (
                <article key={t.id} className="border border-[var(--border)] p-3 text-sm">
                  <p className="uppercase tracking-widest text-[11px] text-[var(--text-muted)]">
                    {supply?.name || "Supply"} · {t.type === "in" ? "Stock In" : "Stock Out"}
                  </p>
                  <p className="mt-1">
                    Quantity: {t.type === "in" ? "+" : "-"}
                    {t.quantity}
                  </p>
                  <p>
                    Previous: {t.previousQuantity} → New: {t.newQuantity}
                  </p>
                  <p>Date: {formatLongDate(t.date) || t.date || "—"}</p>
                  {t.receivedBy ? <p>Received by: {t.receivedBy}{t.position ? ` · ${t.position}` : ""}</p> : null}
                  {t.purpose || t.reference ? <p>Remarks/Purpose: {t.purpose || t.reference}</p> : null}
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
