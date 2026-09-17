"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Download, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { QrCard } from "@/components/qr-card";
import { type PropertyInput, useApp, CLASSIFICATIONS } from "@/lib/app-context";
import { ScanResult } from "@/components/scan-result";
import { downloadPropertyExcel } from "@/lib/files";
import {
  classificationNeedsType,
  codeForType,
  CONSUMABLE_TYPES,
  normalizeTypeFields,
  SEMI_EXPENDABLE_TYPES,
  validateTypeFields,
} from "@/lib/property-types";
import { formatDate, formatMoney } from "@/lib/utils";
import type { PropertyClassification, PropertyRecord } from "@/types";

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { state, schoolProperties, can, assignProperty, transferProperty, updateProperty, deleteProperty, schoolUsers } = useApp();
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
        description={`Item No. ${property.inventoryItemNumber} · ICSNO. ${property.icsNumber}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {can("encode") && !editing ? (
              <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            ) : null}
            <Link href={`/properties/group/${encodeURIComponent(property.icsNumber)}`}>
              <Button type="button" variant="secondary">
                ICSNO. group
              </Button>
            </Link>
            <Button type="button" variant="secondary" onClick={() => downloadPropertyExcel(property, schoolProperties)}>
              <Download className="h-4 w-4" /> Excel
            </Button>
            {can("encode") ? (
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  if (!window.confirm("Delete this property? History for this item will also be removed.")) return;
                  await deleteProperty(property.id);
                  router.push("/properties");
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-4 sm:space-y-6">
          {editing && can("encode") ? (
            <EditForm
              property={property}
              onCancel={() => setEditing(false)}
              onSave={async (input) => {
                await updateProperty(property.id, input);
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
              property={property}
              users={schoolUsers}
              defaults={{
                accountablePerson: property.currentAccountablePerson,
                officeDepartment: property.officeDepartment,
                location: property.location,
              }}
              onSave={(input) => assignProperty(input)}
            />
          ) : null}

          {can("transfer") ? (
            <section className="surface p-4 sm:p-5">
              <h2 className="font-display break-words text-xl sm:text-2xl">Transfer property</h2>
              <TransferForm property={property} onSave={transferProperty} />
            </section>
          ) : null}

          <section className="surface p-4 sm:p-5">
            <h2 className="font-display break-words text-xl sm:text-2xl">History</h2>
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
        </aside>
      </div>
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
  onSave: (input: PropertyInput) => Promise<void> | void;
}) {
  const [form, setForm] = useState({
    ...property,
    type: property.type || "",
    code: property.code || "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const totalCost = Number(form.quantity || 0) * Number(form.unitCost || 0);

  function setClassification(classification: PropertyClassification) {
    setForm((prev) => ({
      ...prev,
      classification,
      type: "",
      code: "",
    }));
  }

  function setPropertyType(typeLabel: string) {
    setForm((prev) => ({
      ...prev,
      type: typeLabel,
      code: codeForType(prev.classification, typeLabel),
    }));
  }

  return (
    <form
      className="surface grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const typeErrors = validateTypeFields(form.classification, form.type, form.code);
        const next: Record<string, string> = {};
        if (typeErrors.type) next.propertyType = typeErrors.type;
        if (typeErrors.code) next.propertyCode = typeErrors.code;
        setFieldErrors(next);
        if (Object.keys(next).length) return;
        const typeFields = normalizeTypeFields(form.classification, form.type, form.code);
        await onSave({ ...form, ...typeFields, totalCost });
      }}
    >
      <Field label="Classification">
        <Select
          value={form.classification}
          onChange={(e) => setClassification(e.target.value as PropertyClassification)}
        >
          {CLASSIFICATIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      {form.classification === "semi_expendable" ? (
        <Field label="Semi-Expendable Type" error={fieldErrors.propertyType}>
          <Select value={form.type} onChange={(e) => setPropertyType(e.target.value)}>
            <option value="">Select type</option>
            {SEMI_EXPENDABLE_TYPES.map((t) => (
              <option key={t.code + t.label} value={t.label}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {form.classification === "consumable" ? (
        <Field label="Consumable Type" error={fieldErrors.propertyType}>
          <Select value={form.type} onChange={(e) => setPropertyType(e.target.value)}>
            <option value="">Select type</option>
            {CONSUMABLE_TYPES.map((t) => (
              <option key={t.code + t.label} value={t.label}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {classificationNeedsType(form.classification) ? (
        <Field label="Code" error={fieldErrors.propertyCode}>
          <Input readOnly value={form.code} placeholder="Auto-generated" />
        </Field>
      ) : null}
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
      <p className="font-display break-words text-xl sm:text-2xl md:col-span-2">Received from</p>
      <Field label="Name">
        <Input value={form.receivedFromName || ""} onChange={(e) => setForm({ ...form, receivedFromName: e.target.value })} />
      </Field>
      <Field label="Position">
        <Input value={form.receivedFromPosition || ""} onChange={(e) => setForm({ ...form, receivedFromPosition: e.target.value })} />
      </Field>
      <p className="font-display break-words text-xl sm:text-2xl md:col-span-2">Received by</p>
      <Field label="Name">
        <Input value={form.receivedByName || ""} onChange={(e) => setForm({ ...form, receivedByName: e.target.value })} />
      </Field>
      <Field label="Position">
        <Input value={form.receivedByPosition || ""} onChange={(e) => setForm({ ...form, receivedByPosition: e.target.value })} />
      </Field>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:col-span-2">
        <Button type="submit" className="w-full sm:w-auto">Update property</Button>
        <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function AssignForm({
  property,
  users,
  defaults,
  onSave,
}: {
  property: PropertyRecord;
  users: { id: string; firstName: string; lastName: string; role: string }[];
  defaults: { accountablePerson: string; officeDepartment: string; location: string };
  onSave: ReturnType<typeof useApp>["assignProperty"];
}) {
  const custodians = users.filter((u) => u.role === "property_custodian");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    assignedUserId: "",
    accountablePerson: defaults.accountablePerson,
    officeDepartment: defaults.officeDepartment,
    location: defaults.location,
    dateAssigned: new Date().toISOString().slice(0, 10),
    deadline: "",
    status: "active" as const,
  });
  const selectedUser = custodians.find((u) => u.id === form.assignedUserId);
  const assignedLabel = selectedUser
    ? `${selectedUser.firstName} ${selectedUser.lastName}`
    : form.accountablePerson || "—";

  function requestSave(e: React.FormEvent) {
    e.preventDefault();
    setConfirmOpen(true);
  }

  async function confirmSave() {
    if (saving) return;
    setSaving(true);
    try {
      await onSave({ propertyId: property.id, ...form });
      setConfirmOpen(false);
    } catch {
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface p-4 sm:p-5">
      <h2 className="font-display break-words text-xl sm:text-2xl">Assign property</h2>
      <form className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={requestSave}>
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
        <Button type="submit" className="w-full sm:w-auto md:col-span-2 md:justify-self-start">Save assignment</Button>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm assignment"
        message="Are you sure you want to assign this property?"
        details={
          <>
            <p>Property: {property.description || "—"}</p>
            <p>Assigned user: {assignedLabel}</p>
            <p>Location: {form.location || "—"}</p>
          </>
        }
        confirmLabel="Confirm Assignment"
        loading={saving}
        onCancel={() => !saving && setConfirmOpen(false)}
        onConfirm={confirmSave}
      />
    </section>
  );
}

function TransferForm({
  property,
  onSave,
}: {
  property: PropertyRecord;
  onSave: ReturnType<typeof useApp>["transferProperty"];
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    newAccountablePerson: "",
    newOffice: "",
    newLocation: "",
    date: new Date().toISOString().slice(0, 10),
    reason: "",
  });

  function requestSave(e: React.FormEvent) {
    e.preventDefault();
    setConfirmOpen(true);
  }

  async function confirmSave() {
    if (saving) return;
    setSaving(true);
    try {
      await onSave({ propertyId: property.id, ...form });
      setConfirmOpen(false);
    } catch {
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={requestSave}>
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
        <Button type="submit" className="w-full sm:w-auto md:col-span-2 md:justify-self-start">Confirm transfer</Button>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm transfer"
        message="Are you sure you want to transfer this property?"
        details={
          <>
            <p>Property: {property.description || "—"}</p>
            <p>Current accountable person: {property.currentAccountablePerson || "—"}</p>
            <p>New accountable person: {form.newAccountablePerson || "—"}</p>
            <p>Current location: {property.location || "—"}</p>
            <p>New location: {form.newLocation || "—"}</p>
            <p>Date: {form.date || "—"}</p>
            {form.reason ? <p>Reason: {form.reason}</p> : null}
          </>
        }
        confirmLabel="Confirm Transfer"
        loading={saving}
        onCancel={() => !saving && setConfirmOpen(false)}
        onConfirm={confirmSave}
      />
    </>
  );
}
