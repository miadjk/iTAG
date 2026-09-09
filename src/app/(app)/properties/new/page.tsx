"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { CLASSIFICATIONS, useApp } from "@/lib/app-context";
import { getSchoolName } from "@/lib/locations";
import { formatMoney } from "@/lib/utils";

export default function NewPropertyPage() {
  const { encodeProperty, can, user } = useApp();
  const router = useRouter();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const schoolName = getSchoolName(user?.schoolId) || user?.schoolName || "";
  const [form, setForm] = useState({
    classification: "low_value" as const,
    entityName: schoolName,
    fundCluster: "",
    icsNumber: "",
    inventoryItemNumber: "",
    propertyNumber: "",
    description: "",
    quantity: 1,
    unitOfMeasure: "Unit",
    dateAcquired: "",
    acquisitionReference: "",
    unitCost: 0,
    fundSource: "",
    custodianLastUser: "",
    currentAccountablePerson: "",
    officeDepartment: "",
    location: schoolName,
    estimatedUsefulLife: "",
    condition: "serviceable" as const,
    status: "active" as const,
    remarks: "",
    brand: "",
    model: "",
    serialNumber: "",
    warranty: "",
  });

  const totalCost = useMemo(() => Number(form.quantity || 0) * Number(form.unitCost || 0), [form.quantity, form.unitCost]);

  useEffect(() => {
    if (!schoolName) return;
    setForm((prev) => {
      if (prev.entityName && prev.entityName !== schoolName && prev.location && prev.location !== schoolName) {
        return prev;
      }
      return {
        ...prev,
        entityName: prev.entityName || schoolName,
        location: prev.location || schoolName,
      };
    });
  }, [schoolName]);

  if (!can("encode")) {
    return <p className="text-sm text-[var(--text-muted)]">Property encoding is performed by the Property Custodian.</p>;
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.entityName.trim()) next.entityName = "This field is required.";
    if (!form.icsNumber.trim()) next.icsNumber = "This field is required.";
    if (!form.inventoryItemNumber.trim()) next.inventoryItemNumber = "This field is required.";
    if (!form.description.trim()) next.description = "This field is required.";
    if (!form.dateAcquired) next.dateAcquired = "This field is required.";
    if (!form.unitOfMeasure.trim()) next.unitOfMeasure = "This field is required.";
    if (!form.quantity || form.quantity <= 0) next.quantity = "Enter a valid quantity.";
    if (form.unitCost < 0) next.unitCost = "Enter a valid unit cost.";
    if (!form.custodianLastUser.trim()) next.custodianLastUser = "This field is required.";
    if (!form.fundSource.trim()) next.fundSource = "This field is required.";
    if (!form.estimatedUsefulLife.trim()) next.estimatedUsefulLife = "This field is required.";
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
      const record = encodeProperty({
        ...form,
        propertyNumber: form.propertyNumber.trim() || form.inventoryItemNumber.trim(),
        currentAccountablePerson: form.currentAccountablePerson || form.custodianLastUser,
        totalCost,
      });
      router.push(`/properties/${record.id}?created=1`);
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
        description="Saving generates a unique QR code and fills the Excel template for this property."
      />
      <form onSubmit={onSubmit} noValidate className="space-y-8">
        <section className="surface grid gap-4 p-5 md:grid-cols-2">
          <Field label="Classification">
            <Select value={form.classification} onChange={(e) => set("classification", e.target.value as typeof form.classification)}>
              {CLASSIFICATIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Entity" error={fieldErrors.entityName}>
            <Input value={form.entityName} onChange={(e) => set("entityName", e.target.value)} />
          </Field>
          <Field label="ICS No." error={fieldErrors.icsNumber}>
            <Input value={form.icsNumber} onChange={(e) => set("icsNumber", e.target.value)} />
          </Field>
          <Field label="Item No." error={fieldErrors.inventoryItemNumber}>
            <Input value={form.inventoryItemNumber} onChange={(e) => set("inventoryItemNumber", e.target.value)} />
          </Field>
          <Field label="Property number">
            <Input value={form.propertyNumber} onChange={(e) => set("propertyNumber", e.target.value)} placeholder="Defaults to Item No." />
          </Field>
          <div className="md:col-span-2">
            <Field label="Description" error={fieldErrors.description}>
              <Input value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </div>
          <Field label="Date acquired" error={fieldErrors.dateAcquired}>
            <Input type="date" value={form.dateAcquired} onChange={(e) => set("dateAcquired", e.target.value)} />
          </Field>
          <Field label="Unit measure" error={fieldErrors.unitOfMeasure}>
            <Input value={form.unitOfMeasure} onChange={(e) => set("unitOfMeasure", e.target.value)} />
          </Field>
          <Field label="Quantity" error={fieldErrors.quantity}>
            <Input type="number" min={1} value={form.quantity} onChange={(e) => set("quantity", Number(e.target.value))} />
          </Field>
          <Field label="Unit cost" error={fieldErrors.unitCost}>
            <Input type="number" min={0} step="0.01" value={form.unitCost} onChange={(e) => set("unitCost", Number(e.target.value))} />
          </Field>
          <Field label="Total cost">
            <Input value={formatMoney(totalCost)} readOnly />
          </Field>
          <Field label="Custodian / last user" error={fieldErrors.custodianLastUser}>
            <Input value={form.custodianLastUser} onChange={(e) => set("custodianLastUser", e.target.value)} />
          </Field>
          <Field label="Fund source" error={fieldErrors.fundSource}>
            <Input value={form.fundSource} onChange={(e) => set("fundSource", e.target.value)} />
          </Field>
          <Field label="Useful life" error={fieldErrors.estimatedUsefulLife}>
            <Input value={form.estimatedUsefulLife} onChange={(e) => set("estimatedUsefulLife", e.target.value)} />
          </Field>
          <Field label="Fund cluster">
            <Input value={form.fundCluster} onChange={(e) => set("fundCluster", e.target.value)} />
          </Field>
        </section>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" loading={loading}>
          Save property
        </Button>
      </form>
    </div>
  );
}
