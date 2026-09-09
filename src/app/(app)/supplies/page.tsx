"use client";

import { useState } from "react";
import { Warehouse } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useApp } from "@/lib/app-context";
import { supplyStatusBadge } from "@/components/badges";

export default function SuppliesPage() {
  const { schoolSupplies, can, upsertSupply, stockIn, stockOut, state } = useApp();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    unit: "ream",
    currentQuantity: 0,
    minimumStockLevel: 10,
    location: "",
    remarks: "",
  });
  const [stock, setStock] = useState({ supplyId: "", type: "in" as "in" | "out", quantity: 1, date: new Date().toISOString().slice(0, 10), reference: "", recipient: "", purpose: "" });

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
        <form
          className="surface mb-6 grid gap-4 p-5 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            upsertSupply(form);
            setOpen(false);
          }}
        >
          <Field label="Supply name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Unit">
            <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </Field>
          <Field label="Current quantity">
            <Input type="number" min={0} value={form.currentQuantity} onChange={(e) => setForm({ ...form, currentQuantity: Number(e.target.value) })} />
          </Field>
          <Field label="Minimum stock level">
            <Input type="number" min={0} value={form.minimumStockLevel} onChange={(e) => setForm({ ...form, minimumStockLevel: Number(e.target.value) })} />
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
          <Button type="submit">Save supply</Button>
        </form>
      ) : null}

      {schoolSupplies.length === 0 ? (
        <EmptyState icon={Warehouse} title="No supplies yet." body="Bond paper, pens, ink, toner, and other replenished items are managed here." />
      ) : (
        <div className="space-y-3">
          {schoolSupplies.map((s) => (
            <article key={s.id} className="surface p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm uppercase tracking-widest">{s.name}</h2>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {s.currentQuantity} {s.unit} · min {s.minimumStockLevel} · {s.location || "No location"}
                  </p>
                </div>
                {supplyStatusBadge(s.status)}
              </div>
            </article>
          ))}
        </div>
      )}

      {can("supplies") && schoolSupplies.length > 0 ? (
        <form
          className="surface mt-8 grid gap-4 p-5 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            try {
              if (stock.type === "in") stockIn(stock.supplyId, stock.quantity, stock.date, stock.reference);
              else stockOut(stock.supplyId, stock.quantity, stock.date, stock.recipient, stock.purpose);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Unable to record stock movement.");
            }
          }}
        >
          <h2 className="font-display text-2xl md:col-span-2">Stock-in / stock-out</h2>
          <Field label="Supply" required>
            <select
              className="h-11 w-full border border-[var(--border)] bg-[var(--bg-muted)] px-3"
              value={stock.supplyId}
              onChange={(e) => setStock({ ...stock, supplyId: e.target.value })}
              required
            >
              <option value="">Select supply</option>
              {schoolSupplies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Movement">
            <select
              className="h-11 w-full border border-[var(--border)] bg-[var(--bg-muted)] px-3"
              value={stock.type}
              onChange={(e) => setStock({ ...stock, type: e.target.value as "in" | "out" })}
            >
              <option value="in">Stock-in</option>
              <option value="out">Stock-out</option>
            </select>
          </Field>
          <Field label="Quantity" required>
            <Input type="number" min={1} value={stock.quantity} onChange={(e) => setStock({ ...stock, quantity: Number(e.target.value) })} />
          </Field>
          <Field label="Date">
            <Input type="date" value={stock.date} onChange={(e) => setStock({ ...stock, date: e.target.value })} />
          </Field>
          {stock.type === "in" ? (
            <Field label="Reference">
              <Input value={stock.reference} onChange={(e) => setStock({ ...stock, reference: e.target.value })} />
            </Field>
          ) : (
            <>
              <Field label="Recipient">
                <Input value={stock.recipient} onChange={(e) => setStock({ ...stock, recipient: e.target.value })} />
              </Field>
              <Field label="Purpose">
                <Input value={stock.purpose} onChange={(e) => setStock({ ...stock, purpose: e.target.value })} />
              </Field>
            </>
          )}
          {error ? <p className="text-sm text-red-400 md:col-span-2">{error}</p> : null}
          <Button type="submit">{stock.type === "in" ? "Save stock-in" : "Save stock-out"}</Button>
        </form>
      ) : null}

      <section className="mt-8">
        <h2 className="font-display text-2xl">Supply history</h2>
        <div className="mt-4 space-y-2">
          {state.stockTransactions.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No stock movements yet.</p>
          ) : (
            state.stockTransactions.slice(0, 20).map((t) => (
              <p key={t.id} className="border border-[var(--border)] p-3 text-sm">
                {t.type === "in" ? "IN" : "OUT"} · {t.quantity} · {t.date} {t.recipient ? `· ${t.recipient}` : ""} {t.reference ? `· ${t.reference}` : ""}
              </p>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
