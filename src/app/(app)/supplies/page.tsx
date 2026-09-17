"use client";

import { useMemo, useState } from "react";
import { Search, Warehouse } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { useApp } from "@/lib/app-context";
import { classLabel, supplyStatusBadge } from "@/components/badges";
import { codeForType, CONSUMABLE_TYPES, validateTypeFields } from "@/lib/property-types";
import type { PropertyClassification } from "@/types";

export default function SuppliesPage() {
  const { schoolSupplies, can, upsertSupply, stockIn, stockOut, state } = useApp();
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [historySupplyId, setHistorySupplyId] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"supply" | "stock" | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    unit: "ream",
    currentQuantity: "",
    minimumStockLevel: "",
    location: "",
    remarks: "",
    classification: "consumable" as PropertyClassification,
    type: "",
    code: "",
  });
  const [stock, setStock] = useState({
    supplyId: "",
    type: "in" as "in" | "out",
    quantity: "",
    date: new Date().toISOString().slice(0, 10),
    recipientName: "",
    purpose: "",
    reference: "",
    position: "",
  });

  function formatHistoryDate(value?: string | null) {
    if (!value) return "—";
    const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  const filteredSupplies = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schoolSupplies;
    return schoolSupplies.filter((s) => {
      const haystack = [s.name, s.type, s.unit, s.code, s.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [schoolSupplies, query]);

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

  const selectedStockSupply = schoolSupplies.find((s) => s.id === stock.supplyId);

  function setConsumableType(typeLabel: string) {
    setForm((prev) => ({
      ...prev,
      type: typeLabel,
      code: codeForType(prev.classification, typeLabel),
    }));
  }

  function resetForm() {
    setForm({
      name: "",
      description: "",
      unit: "ream",
      currentQuantity: "",
      minimumStockLevel: "",
      location: "",
      remarks: "",
      classification: "consumable",
      type: "",
      code: "",
    });
  }

  function requestSaveSupply(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const typeErrors = validateTypeFields(form.classification, form.type, form.code);
    if (typeErrors.type || typeErrors.code) {
      setFormError(typeErrors.type || typeErrors.code || "Select a valid type.");
      return;
    }
    if (!form.name.trim()) {
      setFormError("Supply name is required.");
      return;
    }
    setConfirmKind("supply");
  }

  function requestSaveStock(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!stock.supplyId) {
      setError("Select a supply.");
      return;
    }
    if (!(Number(stock.quantity) > 0)) {
      setError("Enter a valid quantity.");
      return;
    }
    if (stock.type === "out" && !stock.recipientName.trim()) {
      setError("Recipient name is required for stock-out.");
      return;
    }
    if (stock.type === "out" && !stock.purpose.trim()) {
      setError("Purpose is required for stock-out.");
      return;
    }
    setConfirmKind("stock");
  }

  async function confirmSaveSupply() {
    if (saving) return;
    setSaving(true);
    try {
      await upsertSupply({
        ...form,
        description: "",
        remarks: "",
        currentQuantity: Number(form.currentQuantity) || 0,
        minimumStockLevel: Number(form.minimumStockLevel) || 0,
      });
      setOpen(false);
      resetForm();
      setConfirmKind(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to save supply.");
      setConfirmKind(null);
    } finally {
      setSaving(false);
    }
  }

  async function confirmSaveStock() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const qty = Number(stock.quantity) || 0;
      if (stock.type === "in") {
        await stockIn({
          supplyId: stock.supplyId,
          quantity: qty,
          date: stock.date,
          receivedBy: "",
          position: stock.position,
          remarks: stock.reference,
          reference: stock.reference,
        });
      } else {
        await stockOut({
          supplyId: stock.supplyId,
          quantity: qty,
          date: stock.date,
          receivedBy: stock.recipientName,
          position: stock.position,
          remarks: stock.purpose,
        });
      }
      setStock((prev) => ({
        ...prev,
        quantity: "",
        recipientName: "",
        purpose: "",
        reference: "",
        position: "",
      }));
      setHistorySupplyId(stock.supplyId);
      setConfirmKind(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record stock movement.");
      setConfirmKind(null);
    } finally {
      setSaving(false);
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
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => {
                  setOpen((v) => !v);
                  if (!open) setShowHistory(false);
                }}
              >
                {open ? "Close form" : "Add Supply"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowHistory((v) => !v);
                  if (!showHistory) setOpen(false);
                }}
              >
                {showHistory ? "Close History" : "View History"}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setShowHistory((v) => !v)}>
              {showHistory ? "Close History" : "View History"}
            </Button>
          )
        }
      />

      {showHistory ? (
        <section className="surface mb-6 p-4 sm:p-5">
          <h2 className="font-display break-words text-xl sm:text-2xl">Supply history</h2>
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
              supplyHistory.map((t) => {
                const supply = schoolSupplies.find((s) => s.id === t.supplyId);
                const isOut = t.type === "out";
                return (
                  <article key={t.id} className="border border-[var(--border)] p-3 text-sm">
                    <p className="uppercase tracking-widest">{supply?.name || "Supply"}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-widest text-[var(--text-muted)]">
                      {isOut ? "Stock-out" : "Stock-in"}
                    </p>
                    <p className="mt-1">
                      Quantity: {t.quantity}
                      {supply?.unit ? ` ${supply.unit}` : ""}
                    </p>
                    {isOut ? (
                      <>
                        <p>Recipient: {t.recipient || t.receivedBy || "—"}</p>
                        <p>Purpose: {t.purpose || "—"}</p>
                      </>
                    ) : (
                      <p>Reference: {t.reference || t.purpose || "—"}</p>
                    )}
                    <p>Date: {formatHistoryDate(t.date)}</p>
                  </article>
                );
              })
            )}
          </div>
        </section>
      ) : null}

      {can("supplies") && open ? (
        <form className="surface mb-6 grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2" onSubmit={requestSaveSupply} noValidate>
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
              value={form.currentQuantity}
              onChange={(e) => setForm({ ...form, currentQuantity: e.target.value })}
            />
          </Field>
          <Field label="Minimum stock level">
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={form.minimumStockLevel}
              onChange={(e) => setForm({ ...form, minimumStockLevel: e.target.value })}
            />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          {formError ? <p className="break-words text-sm text-red-700 md:col-span-2">{formError}</p> : null}
          <Button type="submit" className="w-full sm:w-auto md:col-span-2 md:justify-self-start">Save supply</Button>
        </form>
      ) : null}

      {schoolSupplies.length === 0 ? (
        <EmptyState icon={Warehouse} title="No supplies yet." body="Bond paper, pens, ink, toner, and other replenished items are managed here." />
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search supplies..."
              className="pl-10"
              aria-label="Search supplies"
            />
          </div>
          {filteredSupplies.length === 0 ? (
            <p className="surface p-4 text-sm text-[var(--text-muted)]">No supplies found.</p>
          ) : (
            filteredSupplies.map((s) => (
              <article key={s.id} className="surface p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1 text-sm">
                    <h2 className="break-words text-sm uppercase tracking-widest">{s.name}</h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      Current stock: {s.currentQuantity} {s.unit} · Minimum stock: {s.minimumStockLevel}
                      {s.location ? ` · ${s.location}` : ""}
                    </p>
                    {s.classification ? (
                      <p className="text-xs text-[var(--text-muted)]">
                        Classification: {classLabel(s.classification)}
                        {s.type ? ` · Type: ${s.type}` : ""}
                        {s.code ? ` · Code: ${s.code}` : ""}
                      </p>
                    ) : null}
                  </div>
                  {supplyStatusBadge(s.status)}
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {can("supplies") && schoolSupplies.length > 0 ? (
        <form className="surface mt-8 grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2" onSubmit={requestSaveStock}>
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
            <Input
              type="number"
              min={1}
              placeholder="0"
              value={stock.quantity}
              onChange={(e) => setStock({ ...stock, quantity: e.target.value })}
            />
          </Field>
          <Field label="Date">
            <Input type="date" value={stock.date} onChange={(e) => setStock({ ...stock, date: e.target.value })} />
          </Field>
          {stock.type === "out" ? (
            <>
              <Field label="Recipient name" required>
                <Input
                  value={stock.recipientName}
                  onChange={(e) => setStock({ ...stock, recipientName: e.target.value })}
                  placeholder="Juan Dela Cruz"
                  required
                />
              </Field>
              <Field label="Purpose" required>
                <Input
                  value={stock.purpose}
                  onChange={(e) => setStock({ ...stock, purpose: e.target.value })}
                  placeholder="Office use"
                  required
                />
              </Field>
            </>
          ) : (
            <div className="md:col-span-2">
              <Field label="Reference">
                <Input
                  value={stock.reference}
                  onChange={(e) => setStock({ ...stock, reference: e.target.value })}
                  placeholder="Delivery Receipt #001"
                />
              </Field>
            </div>
          )}
          {error ? <p className="break-words text-sm text-red-700 md:col-span-2">{error}</p> : null}
          <Button type="submit" className="w-full sm:w-auto md:col-span-2 md:justify-self-start">
            {stock.type === "in" ? "Save stock-in" : "Save stock-out"}
          </Button>
        </form>
      ) : null}

      <ConfirmDialog
        open={confirmKind === "supply"}
        title="Confirm supply"
        message="Are you sure you want to add this supply?"
        details={
          <>
            <p>Name: {form.name || "—"}</p>
            <p>Unit: {form.unit || "—"}</p>
            <p>Type: {form.type || "—"}</p>
            <p>Code: {form.code || "—"}</p>
            <p>Initial quantity: {form.currentQuantity || "0"}</p>
            <p>Minimum stock: {form.minimumStockLevel || "0"}</p>
            <p>Location: {form.location || "—"}</p>
          </>
        }
        confirmLabel="Confirm"
        loading={saving}
        onCancel={() => !saving && setConfirmKind(null)}
        onConfirm={confirmSaveSupply}
      />

      <ConfirmDialog
        open={confirmKind === "stock"}
        title={stock.type === "out" ? "Confirm stock-out" : "Confirm stock-in"}
        message={
          stock.type === "out"
            ? "Are you sure you want to record this Stock-out?"
            : "Are you sure you want to record this Stock-in?"
        }
        details={
          stock.type === "out" ? (
            <>
              <p>Item: {selectedStockSupply?.name || "—"}</p>
              <p>
                Quantity: {stock.quantity || "0"}
                {selectedStockSupply?.unit ? ` ${selectedStockSupply.unit}` : ""}
              </p>
              <p>Recipient: {stock.recipientName || "—"}</p>
              <p>Purpose: {stock.purpose || "—"}</p>
              <p>Date: {formatHistoryDate(stock.date)}</p>
            </>
          ) : (
            <>
              <p>Item: {selectedStockSupply?.name || "—"}</p>
              <p>
                Quantity: {stock.quantity || "0"}
                {selectedStockSupply?.unit ? ` ${selectedStockSupply.unit}` : ""}
              </p>
              <p>Reference: {stock.reference || "—"}</p>
              <p>Date: {formatHistoryDate(stock.date)}</p>
            </>
          )
        }
        confirmLabel={stock.type === "out" ? "Confirm Stock-Out" : "Confirm Stock-In"}
        loading={saving}
        onCancel={() => !saving && setConfirmKind(null)}
        onConfirm={confirmSaveStock}
      />
    </div>
  );
}
