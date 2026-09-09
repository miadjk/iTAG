"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { LocationFields, type LocationValue } from "@/components/location-fields";
import { useApp } from "@/lib/app-context";
import { displayName } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";

export default function UsersPage() {
  const { user, schoolUsers, createCustodian, replaceSchoolHead, setCustodianActive, can } = useApp();
  const [mode, setMode] = useState<"none" | "custodian" | "replace">("none");
  const [error, setError] = useState("");
  const [location, setLocation] = useState<LocationValue>({
    regionId: user?.regionId ?? "",
    provinceId: user?.provinceId ?? "",
    municipalityId: user?.municipalityId ?? "",
    districtId: user?.districtId ?? "",
    schoolId: user?.schoolId ?? "",
  });
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
  });

  if (!can("users")) {
    return <p className="text-sm text-[var(--text-muted)]">Custodian management is available to the School Head.</p>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (mode === "custodian") await createCustodian({ ...form, ...location });
      if (mode === "replace") await replaceSchoolHead({ ...form, ...location });
      setMode("none");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save account.");
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Administration"
        title="Users / custodians"
        description="Assign or change Property Custodians. Replacing a School Head keeps inventory, QR codes, history, and activity records intact."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setMode("custodian")}>
              Add custodian
            </Button>
            <Button type="button" onClick={() => setMode("replace")}>
              Replace School Head
            </Button>
          </div>
        }
      />

      {mode !== "none" ? (
        <form onSubmit={submit} className="surface mb-8 space-y-4 p-5">
          <h2 className="font-display text-2xl">{mode === "replace" ? "New School Head" : "New Property Custodian"}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="First name" error={!form.firstName.trim() && error ? "This field is required." : undefined}>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </Field>
            <Field label="Middle name">
              <Input value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
            </Field>
            <Field label="Last name">
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </Field>
          </div>
          <Field label="DepEd email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Password" hint="Exactly 9 digits">
            <Input type="password" inputMode="numeric" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <LocationFields value={location} onChange={setLocation} />
          {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit">Save</Button>
            <Button type="button" variant="secondary" onClick={() => setMode("none")}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <div className="space-y-3">
        {schoolUsers.map((u) => (
          <article key={u.id} className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p>{displayName(u)}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {u.email} · {u.role === "school_head" ? "School Head" : "Property Custodian"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge label={u.active ? "Active" : "Inactive"} tone={u.active ? "ok" : "danger"} />
              {u.role === "property_custodian" ? (
                <Button type="button" variant="secondary" onClick={() => setCustodianActive(u.id, !u.active)}>
                  {u.active ? "Deactivate" : "Activate"}
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
