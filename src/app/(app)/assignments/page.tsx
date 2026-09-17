"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { DistrictSchoolFields, getSchoolName } from "@/components/location-fields";
import { StatusBadge } from "@/components/ui/status-badge";
import { useApp } from "@/lib/app-context";
import { displayName, formatDate } from "@/lib/utils";

export default function AssignmentsPage() {
  const { state, schoolProperties, schoolUsers, user, can, assignProperty } = useApp();
  const ids = new Set(schoolProperties.map((p) => p.id));
  const all = state.assignments.filter((a) => ids.has(a.propertyId));
  const rows =
    user?.role === "school_head"
      ? all
      : all.filter((a) => a.assignedUserId === user?.id || a.assignedBy === user?.id);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    propertyId: "",
    assignedUserId: "",
    accountablePerson: "",
    officeDepartment: "",
    districtId: "",
    schoolId: "",
    dateAssigned: new Date().toISOString().slice(0, 10),
    deadline: "",
    status: "pending" as const,
  });

  const selectedProperty = schoolProperties.find((p) => p.id === form.propertyId);
  const selectedUser = schoolUsers.find((u) => u.id === form.assignedUserId);
  const schoolLocation = getSchoolName(form.schoolId);
  const registeredUsers = schoolUsers.filter((u) => u.role === "property_custodian" || u.role === "school_head");

  function requestSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.propertyId || !form.assignedUserId) {
      setFormError("Property and assigned user are required.");
      return;
    }
    if (!form.schoolId) {
      setFormError("Select a school / location.");
      return;
    }
    setFormError("");
    setConfirmOpen(true);
  }

  async function confirmSave() {
    if (saving) return;
    setSaving(true);
    try {
      await assignProperty({
        propertyId: form.propertyId,
        assignedUserId: form.assignedUserId,
        accountablePerson: selectedUser
          ? `${selectedUser.firstName} ${selectedUser.lastName}`
          : form.accountablePerson,
        officeDepartment: form.officeDepartment,
        location: schoolLocation,
        dateAssigned: form.dateAssigned,
        deadline: form.deadline,
        status: form.status,
      });
      setFormError("");
      setConfirmOpen(false);
      setOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to save assignment.");
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Accountability"
        title="Assignments"
        description="Assignments are stored with the property record and shown to the assigned user."
        actions={
          user?.role === "school_head" && can("assign") ? (
            <Button type="button" onClick={() => setOpen((v) => !v)}>
              {open ? "Close" : "Create assignment"}
            </Button>
          ) : null
        }
      />

      {user?.role === "school_head" && can("assign") && open ? (
        <form className="surface mb-6 grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2" onSubmit={requestSave}>
          <Field label="Property" required>
            <Select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })} required>
              <option value="">Select property</option>
              {schoolProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.description}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assign to user" required>
            <Select
              value={form.assignedUserId}
              onChange={(e) => {
                const id = e.target.value;
                const nextUser = registeredUsers.find((u) => u.id === id);
                setForm({
                  ...form,
                  assignedUserId: id,
                  accountablePerson: nextUser ? `${nextUser.firstName} ${nextUser.lastName}` : form.accountablePerson,
                });
              }}
              required
            >
              <option value="">Select user</option>
              {registeredUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {displayName(u)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Accountable person">
            <Input
              value={form.accountablePerson}
              onChange={(e) => setForm({ ...form, accountablePerson: e.target.value })}
              readOnly={Boolean(selectedUser)}
            />
          </Field>
          <Field label="Office / department">
            <Input value={form.officeDepartment} onChange={(e) => setForm({ ...form, officeDepartment: e.target.value })} />
          </Field>
          <DistrictSchoolFields
            districtId={form.districtId}
            schoolId={form.schoolId}
            districtLabelText="District / Direction"
            schoolLabelText="School / Location"
            onChange={({ districtId, schoolId }) => setForm({ ...form, districtId, schoolId })}
          />
          <Field label="Date assigned">
            <Input type="date" value={form.dateAssigned} onChange={(e) => setForm({ ...form, dateAssigned: e.target.value })} />
          </Field>
          <Field label="Deadline">
            <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </Field>
          {formError ? <p className="break-words text-sm text-red-700 md:col-span-2">{formError}</p> : null}
          <Button type="submit" className="w-full sm:w-auto md:col-span-2 md:justify-self-start">Save assignment</Button>
        </form>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No assignments yet." body="Create an assignment to connect a property with a user. Both dashboards read the same records." />
      ) : (
        <div className="space-y-3">
          {rows.map((a) => {
            const p = schoolProperties.find((x) => x.id === a.propertyId);
            const assigned = schoolUsers.find((u) => u.id === a.assignedUserId);
            return (
              <article key={a.id} className="surface p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link href={`/properties/${a.propertyId}`} className="break-words text-sm font-medium text-[#3F3FA3] hover:bg-[#FFFFD3] hover:text-[#1a1a1e] hover:underline">
                      {p?.description || "Property"}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {assigned ? displayName(assigned) : a.accountablePerson} · {a.location || "No location"}
                    </p>
                  </div>
                  <StatusBadge label={a.status ?? "active"} tone="accent" />
                </div>
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  Assigned {formatDate(a.dateAssigned)}
                  {a.deadline ? ` · Deadline ${a.deadline}` : ""}
                </p>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm assignment"
        message="Are you sure you want to assign this property?"
        details={
          <>
            <p>Property: {selectedProperty?.description || "—"}</p>
            <p>Assigned user: {selectedUser ? displayName(selectedUser) : "—"}</p>
            <p>Accountable person: {form.accountablePerson || "—"}</p>
            <p>Office / department: {form.officeDepartment || "—"}</p>
            <p>School / location: {schoolLocation || "—"}</p>
            {form.deadline ? <p>Deadline: {form.deadline}</p> : null}
          </>
        }
        confirmLabel="Confirm Assignment"
        loading={saving}
        onCancel={() => !saving && setConfirmOpen(false)}
        onConfirm={confirmSave}
      />
    </div>
  );
}
