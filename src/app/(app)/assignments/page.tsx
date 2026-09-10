"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
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
  const [form, setForm] = useState({
    propertyId: "",
    assignedUserId: "",
    accountablePerson: "",
    officeDepartment: "",
    location: "",
    dateAssigned: new Date().toISOString().slice(0, 10),
    deadline: "",
    status: "pending" as const,
  });

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
        <form
          className="surface mb-6 grid gap-4 p-5 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.propertyId || !form.assignedUserId) {
              setFormError("This field is required.");
              return;
            }
            try {
              await assignProperty({
                ...form,
                accountablePerson:
                  schoolUsers.find((u) => u.id === form.assignedUserId)
                    ? `${schoolUsers.find((u) => u.id === form.assignedUserId)?.firstName} ${schoolUsers.find((u) => u.id === form.assignedUserId)?.lastName}`
                    : form.accountablePerson,
              });
              setFormError("");
              setOpen(false);
            } catch (err) {
              setFormError(err instanceof Error ? err.message : "Unable to save assignment.");
            }
          }}
        >
          <Field label="Property">
            <Select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
              <option value="">Select property</option>
              {schoolProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.description}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assign to user">
            <Select value={form.assignedUserId} onChange={(e) => setForm({ ...form, assignedUserId: e.target.value })}>
              <option value="">Select user</option>
              {schoolUsers
                .filter((u) => u.role === "property_custodian")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {displayName(u)}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Details">
            <Input value={form.accountablePerson} onChange={(e) => setForm({ ...form, accountablePerson: e.target.value })} placeholder="Accountable person / notes" />
          </Field>
          <Field label="Deadline">
            <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </Field>
          {formError ? <p className="text-sm text-red-600 md:col-span-2">{formError}</p> : null}
          <Button type="submit">Save assignment</Button>
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
                  <div>
                    <Link href={`/properties/${a.propertyId}`} className="text-sm text-[#8a7310] dark:text-[#F1E5A1]">
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
    </div>
  );
}
