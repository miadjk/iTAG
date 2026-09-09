"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Download, Pencil, Printer } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { QrCard } from "@/components/qr-card";
import { type PropertyInput, useApp } from "@/lib/app-context";
import { ScanResult } from "@/components/scan-result";
import { downloadPropertyExcel } from "@/lib/files";
import { formatDate, formatMoney } from "@/lib/utils";
import type { PropertyRecord } from "@/types";

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const { state, schoolProperties, can, assignProperty, transferProperty, updateProperty, schoolUsers } = useApp();
  const property = schoolProperties.find((p) => p.id === params.id) ?? state.properties.find((p) => p.id === params.id);
  const [editing, setEditing] = useState(search.get("edit") === "1");
  const created = search.get("created") === "1";
  const scanned = search.get("scan") === "1";

  if (!property) {
    return <p className="text-sm text-[var(--text-muted)]">Property not found, or it belongs to another school.</p>;
  }

  const history = state.propertyHistory.filter((h) => h.propertyId === property.id);

  return (
    <div>
      <PageHeader
        kicker={scanned ? "Scan result" : created ? "QR and Excel ready" : "Property record"}
        title={scanned ? "Scan result" : property.description}
        description={property.inventoryItemNumber || property.propertyNumber}
        actions={
          <div className="flex flex-wrap gap-2">
            {can("encode") && !editing ? (
              <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => downloadPropertyExcel(property, schoolProperties)}>
              <Download className="h-4 w-4" /> Download Excel
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {editing && can("encode") ? (
            <EditForm
              property={property}
              onCancel={() => setEditing(false)}
              onSave={(input) => {
                updateProperty(property.id, input);
                setEditing(false);
              }}
            />
          ) : (
            <section>
              <ScanResult property={property} title={scanned ? "Scan result" : "Property details"} />
            </section>
          )}

          {can("assign") ? (
            <AssignForm
              propertyId={property.id}
              users={schoolUsers}
              defaults={{
                accountablePerson: property.currentAccountablePerson,
                officeDepartment: property.officeDepartment,
                location: property.location,
              }}
              onSave={assignProperty}
            />
          ) : null}

          {can("transfer") ? (
            <section className="surface p-5">
              <h2 className="font-display text-2xl">Transfer property</h2>
              <TransferForm propertyId={property.id} onSave={transferProperty} />
            </section>
          ) : null}

          <section className="surface p-5">
            <h2 className="font-display text-2xl">History</h2>
            <div className="mt-4 space-y-3">
              {history.map((h) => (
                <div key={h.id} className="border-b border-[var(--border)] pb-3 text-sm text-[var(--text)]">
                  <p>{h.summary}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-widest text-[var(--text-muted)]">
                    {h.action} · {formatDate(h.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="surface h-fit p-5">
          <QrCard property={property} />
          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full"
            onClick={() => {
              window.print();
            }}
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
        </aside>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--text)]">{value || "—"}</p>
    </div>
  );
}

function EditForm({
  property,
  onCancel,
  onSave,
}: {
  property: PropertyRecord;
  onCancel: () => void;
  onSave: (input: PropertyInput) => void;
}) {
  const [form, setForm] = useState({ ...property });
  const totalCost = Number(form.quantity || 0) * Number(form.unitCost || 0);
  return (
    <form
      className="surface grid gap-4 p-5 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...form, totalCost });
      }}
    >
      <Field label="Entity">
        <Input value={form.entityName} onChange={(e) => setForm({ ...form, entityName: e.target.value })} />
      </Field>
      <Field label="ICS No.">
        <Input value={form.icsNumber} onChange={(e) => setForm({ ...form, icsNumber: e.target.value })} />
      </Field>
      <Field label="Item No.">
        <Input value={form.inventoryItemNumber} onChange={(e) => setForm({ ...form, inventoryItemNumber: e.target.value })} />
      </Field>
      <Field label="Description">
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>
      <Field label="Date acquired">
        <Input type="date" value={form.dateAcquired} onChange={(e) => setForm({ ...form, dateAcquired: e.target.value })} />
      </Field>
      <Field label="Unit measure">
        <Input value={form.unitOfMeasure} onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })} />
      </Field>
      <Field label="Quantity">
        <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
      </Field>
      <Field label="Unit cost">
        <Input type="number" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })} />
      </Field>
      <Field label="Total cost">
        <Input readOnly value={formatMoney(totalCost)} />
      </Field>
      <Field label="Custodian / last user">
        <Input value={form.custodianLastUser} onChange={(e) => setForm({ ...form, custodianLastUser: e.target.value })} />
      </Field>
      <Field label="Fund source">
        <Input value={form.fundSource} onChange={(e) => setForm({ ...form, fundSource: e.target.value })} />
      </Field>
      <Field label="Useful life">
        <Input value={form.estimatedUsefulLife} onChange={(e) => setForm({ ...form, estimatedUsefulLife: e.target.value })} />
      </Field>
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit">Update property</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function AssignForm({
  propertyId,
  users,
  defaults,
  onSave,
}: {
  propertyId: string;
  users: { id: string; firstName: string; lastName: string; role: string }[];
  defaults: { accountablePerson: string; officeDepartment: string; location: string };
  onSave: ReturnType<typeof useApp>["assignProperty"];
}) {
  const custodians = users.filter((u) => u.role === "property_custodian");
  const [form, setForm] = useState({
    assignedUserId: "",
    accountablePerson: defaults.accountablePerson,
    officeDepartment: defaults.officeDepartment,
    location: defaults.location,
    dateAssigned: new Date().toISOString().slice(0, 10),
    deadline: "",
    status: "active" as const,
  });
  return (
    <section className="surface p-5">
      <h2 className="font-display text-2xl">Assign property</h2>
      <form
        className="mt-4 grid gap-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ propertyId, ...form });
        }}
      >
        <Field label="Assign to user">
          <Select value={form.assignedUserId} onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })}>
            <option value="">Select user (optional)</option>
            {custodians.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Accountable person">
          <Input value={form.accountablePerson} onChange={(e) => setForm({ ...form, accountablePerson: e.target.value })} />
        </Field>
        <Field label="Office / department">
          <Input value={form.officeDepartment} onChange={(e) => setForm({ ...form, officeDepartment: e.target.value })} />
        </Field>
        <Field label="Location">
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </Field>
        <Field label="Date assigned">
          <Input type="date" value={form.dateAssigned} onChange={(e) => setForm({ ...form, dateAssigned: e.target.value })} />
        </Field>
        <Field label="Deadline">
          <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        </Field>
        <Button type="submit">Save assignment</Button>
      </form>
    </section>
  );
}

function TransferForm({
  propertyId,
  onSave,
}: {
  propertyId: string;
  onSave: ReturnType<typeof useApp>["transferProperty"];
}) {
  const [form, setForm] = useState({
    newAccountablePerson: "",
    newOffice: "",
    newLocation: "",
    date: new Date().toISOString().slice(0, 10),
    reason: "",
  });
  return (
    <form
      className="mt-4 grid gap-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ propertyId, ...form });
      }}
    >
      <Field label="New accountable person">
        <Input value={form.newAccountablePerson} onChange={(e) => setForm({ ...form, newAccountablePerson: e.target.value })} />
      </Field>
      <Field label="New office">
        <Input value={form.newOffice} onChange={(e) => setForm({ ...form, newOffice: e.target.value })} />
      </Field>
      <Field label="New location">
        <Input value={form.newLocation} onChange={(e) => setForm({ ...form, newLocation: e.target.value })} />
      </Field>
      <Field label="Date">
        <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </Field>
      <div className="md:col-span-2">
        <Field label="Reason">
          <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </Field>
      </div>
      <Button type="submit">Confirm transfer</Button>
    </form>
  );
}
