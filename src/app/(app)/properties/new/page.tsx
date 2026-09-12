"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { CLASSIFICATIONS, useApp, type PropertyInput } from "@/lib/app-context";
import { getSchoolName } from "@/lib/locations";
import { formatMoney, normalizeKey } from "@/lib/utils";

type ItemDraft = {
  inventoryItemNumber: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  dateAcquired: string;
  unitCost: number;
  fundSource: string;
  custodianLastUser: string;
  estimatedUsefulLife: string;
  brand: string;
  model: string;
  serialNumber: string;
  remarks: string;
};

function emptyItem(): ItemDraft {
  return {
    inventoryItemNumber: "",
    description: "",
    quantity: 1,
    unitOfMeasure: "Unit",
    dateAcquired: "",
    unitCost: 0,
    fundSource: "",
    custodianLastUser: "",
    estimatedUsefulLife: "",
    brand: "",
    model: "",
    serialNumber: "",
    remarks: "",
  };
}

export default function NewPropertyPage() {
  const { encodeProperties, can, user, schoolProperties } = useApp();
  const router = useRouter();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const schoolName = getSchoolName(user?.schoolId) || user?.schoolName || "";
  const [header, setHeader] = useState({
    classification: "low_value" as const,
    entityName: schoolName,
    fundCluster: "",
    icsNumber: "",
    location: schoolName,
    officeDepartment: "",
    condition: "serviceable" as const,
    status: "idle" as const,
  });
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);

  const existingGroup = useMemo(() => {
    const ics = normalizeKey(header.icsNumber);
    if (!ics) return [];
    return schoolProperties.filter((p) => normalizeKey(p.icsNumber).toLowerCase() === ics.toLowerCase());
  }, [header.icsNumber, schoolProperties]);

  useEffect(() => {
    if (!schoolName) return;
    setHeader((prev) => ({
      ...prev,
      entityName: prev.entityName || schoolName,
      location: prev.location || schoolName,
    }));
  }, [schoolName]);

  useEffect(() => {
    if (!existingGroup.length) return;
    const first = existingGroup[0];
    setHeader((prev) => ({
      ...prev,
      entityName: prev.entityName || first.entityName,
      fundCluster: prev.fundCluster || first.fundCluster,
      location: prev.location || first.location,
      officeDepartment: prev.officeDepartment || first.officeDepartment,
      classification: prev.classification || first.classification,
    }));
  }, [existingGroup]);

  if (!can("encode")) {
    return <p className="text-sm text-[var(--text-muted)]">Property encoding is performed by the Property Custodian.</p>;
  }

  function setItem(index: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!header.entityName.trim()) next.entityName = "This field is required.";
    if (!header.icsNumber.trim()) next.icsNumber = "This field is required.";
    items.forEach((item, index) => {
      if (!item.inventoryItemNumber.trim()) next[`item-${index}-no`] = "This field is required.";
      if (!item.description.trim()) next[`item-${index}-desc`] = "This field is required.";
      if (!item.dateAcquired) next[`item-${index}-date`] = "This field is required.";
      if (!item.unitOfMeasure.trim()) next[`item-${index}-unit`] = "This field is required.";
      if (!item.quantity || item.quantity <= 0) next[`item-${index}-qty`] = "Enter a valid quantity.";
      if (item.unitCost < 0) next[`item-${index}-cost`] = "Enter a valid unit cost.";
      if (!item.custodianLastUser.trim()) next[`item-${index}-custodian`] = "This field is required.";
      if (!item.fundSource.trim()) next[`item-${index}-fund`] = "This field is required.";
      if (!item.estimatedUsefulLife.trim()) next[`item-${index}-life`] = "This field is required.";
    });
    const seen = new Set<string>();
    items.forEach((item, index) => {
      const key = item.inventoryItemNumber.trim().toLowerCase();
      if (key && seen.has(key)) next[`item-${index}-no`] = "Duplicate Item No. in this form.";
      seen.add(key);
    });
    setFieldErrors(next);
    if (Object.keys(next).length) {
      setError("Please complete the highlighted fields.");
      return;
    }
    if (!user?.schoolId) {
      setError("Complete your school profile before encoding properties.");
      return;
    }
    setLoading(true);
    try {
      const payload: PropertyInput[] = items.map((item) => ({
        classification: header.classification,
        entityName: header.entityName.trim(),
        fundCluster: header.fundCluster,
        icsNumber: header.icsNumber.trim(),
        inventoryItemNumber: item.inventoryItemNumber.trim(),
        description: item.description.trim(),
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        dateAcquired: item.dateAcquired,
        acquisitionReference: "",
        unitCost: item.unitCost,
        totalCost: item.quantity * item.unitCost,
        fundSource: item.fundSource,
        custodianLastUser: item.custodianLastUser,
currentAccountablePerson: item.custodianLastUser,
        officeDepartment: header.officeDepartment,
        location: header.location,
        estimatedUsefulLife: item.estimatedUsefulLife,
        condition: header.condition,
        status: header.status,
        remarks: item.remarks,
        brand: item.brand,
        model: item.model,
        serialNumber: item.serialNumber,
        warranty: "",
      }));
      const created = await encodeProperties(payload);
      router.push(`/properties/group/${encodeURIComponent(header.icsNumber.trim())}?created=${created.length}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save property.");
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        kicker="My properties"
        title="Add property"
        description="Items that share an ICSNO. stay in one group. Each item still gets its own QR code and can be exported together as Excel."
      />
      <form onSubmit={onSubmit} noValidate className="space-y-6 sm:space-y-8">
        <section className="surface grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2">
          <Field label="Classification">
            <Select
              value={header.classification}
              onChange={(e) => setHeader({ ...header, classification: e.target.value as typeof header.classification })}
            >
              {CLASSIFICATIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Entity" error={fieldErrors.entityName}>
            <Input value={header.entityName} onChange={(e) => setHeader({ ...header, entityName: e.target.value })} />
          </Field>
          <Field label="ICSNO." error={fieldErrors.icsNumber}>
            <Input
              value={header.icsNumber}
              onChange={(e) => setHeader({ ...header, icsNumber: e.target.value })}
              placeholder="e.g. 2026-001"
            />
          </Field>
          <Field label="Fund cluster">
            <Input value={header.fundCluster} onChange={(e) => setHeader({ ...header, fundCluster: e.target.value })} />
          </Field>
          <Field label="Location">
            <Input value={header.location} onChange={(e) => setHeader({ ...header, location: e.target.value })} />
          </Field>
          <Field label="Office / department">
            <Input value={header.officeDepartment} onChange={(e) => setHeader({ ...header, officeDepartment: e.target.value })} />
          </Field>

        </section>

        {existingGroup.length ? (
          <p className="text-sm text-[var(--text-muted)]">
            ICSNO. {existingGroup[0].icsNumber} already has {existingGroup.length} item
            {existingGroup.length === 1 ? "" : "s"}. New items will be added to that group.
          </p>
        ) : null}

        {items.map((item, index) => (
          <section key={index} className="surface grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2">
            <div className="flex flex-wrap items-center justify-between gap-2 md:col-span-2">
              <h2 className="font-display break-words text-xl sm:text-2xl">Property {index + 1}</h2>
              {items.length > 1 ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs uppercase tracking-widest text-[var(--text-muted)] transition hover:bg-[#FDF4D2] hover:text-[#9564DD]"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              ) : null}
            </div>
            <Field label="Item No." error={fieldErrors[`item-${index}-no`]}>
              <Input value={item.inventoryItemNumber} onChange={(e) => setItem(index, { inventoryItemNumber: e.target.value })} />
            </Field>
            <Field label="Description" error={fieldErrors[`item-${index}-desc`]}>
              <Input value={item.description} onChange={(e) => setItem(index, { description: e.target.value })} />
            </Field>
            <Field label="Date acquired" error={fieldErrors[`item-${index}-date`]}>
              <Input type="date" value={item.dateAcquired} onChange={(e) => setItem(index, { dateAcquired: e.target.value })} />
            </Field>
            <Field label="Unit measure" error={fieldErrors[`item-${index}-unit`]}>
              <Input value={item.unitOfMeasure} onChange={(e) => setItem(index, { unitOfMeasure: e.target.value })} />
            </Field>
            <Field label="Quantity" error={fieldErrors[`item-${index}-qty`]}>
              <Input
                type="number"
                min={1}
                placeholder="0"
                value={item.quantity || ""}
                onChange={(e) => setItem(index, { quantity: e.target.value === "" ? 0 : Number(e.target.value) })}
              />
            </Field>
            <Field label="Unit cost" error={fieldErrors[`item-${index}-cost`]}>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={item.unitCost || ""}
                onChange={(e) => setItem(index, { unitCost: e.target.value === "" ? 0 : Number(e.target.value) })}
              />
            </Field>
            <Field label="Total cost">
              <Input readOnly value={formatMoney(item.quantity * item.unitCost)} />
            </Field>
            <Field label="Custodian / last user" error={fieldErrors[`item-${index}-custodian`]}>
              <Input value={item.custodianLastUser} onChange={(e) => setItem(index, { custodianLastUser: e.target.value })} />
            </Field>
            <Field label="Fund source" error={fieldErrors[`item-${index}-fund`]}>
              <Input value={item.fundSource} onChange={(e) => setItem(index, { fundSource: e.target.value })} />
            </Field>
            <Field label="Useful life" error={fieldErrors[`item-${index}-life`]}>
              <Input value={item.estimatedUsefulLife} onChange={(e) => setItem(index, { estimatedUsefulLife: e.target.value })} />
            </Field>
          </section>
        ))}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setItems((prev) => [...prev, emptyItem()])}>
            <Plus className="h-4 w-4" /> Add another property
          </Button>
        </div>
        {error ? <p className="break-words text-sm text-red-700">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-full sm:w-auto">
          Save {items.length > 1 ? "properties" : "property"}
        </Button>
      </form>
    </div>
  );
}
