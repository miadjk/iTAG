"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, Package, Warehouse } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useApp } from "@/lib/app-context";
import { displayName } from "@/lib/utils";
import { classLabel, supplyStatusBadge } from "@/components/badges";

export default function DashboardPage() {
  const { user, schoolProperties, schoolSupplies, unreadNotifications, state, can } = useApp();
  if (!user) return null;

  const myAssignments =
    user.role === "school_head"
      ? state.assignments.filter((a) => schoolProperties.some((p) => p.id === a.propertyId)).slice(0, 5)
      : state.assignments.filter((a) => a.assignedUserId === user.id).slice(0, 5);

  const lowValue = schoolProperties.filter((p) => p.classification === "low_value").length;
  const highValue = schoolProperties.filter((p) => p.classification === "high_value").length;
  const lowStock = schoolSupplies.filter((s) => s.status !== "available").length;
  const recentHistory = state.propertyHistory.filter((h) => schoolProperties.some((p) => p.id === h.propertyId)).slice(0, 6);
  const recentAudit = state.auditLogs.filter((a) => a.userId === user.id).slice(0, 6);

  return (
    <div>
      <PageHeader
        kicker={user.role === "school_head" ? "School Head" : "Property Custodian"}
        title={`Welcome, ${user.firstName}.`}
        description={
          user.role === "school_head"
            ? "Monitor inventory, assignments, transfers, reports, and system activity. Encoding remains with the Property Custodian."
            : "Encode properties, generate QR codes and Excel files, assign, transfer, and keep supplies current."
        }
      />

      {user.mustUpdateCredentials ? (
        <div className="surface-accent mb-6 flex items-start gap-3 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-[#9564DD]" />
          <div className="min-w-0">
            <p className="break-words text-sm">Update your School Head profile before operating the school inventory.</p>
            <Link href="/profile?setup=1" className="mt-2 inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-widest text-[#5e2fb0] hover:text-[#9564DD]">
              Complete setup <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <Stat label="Properties" value={schoolProperties.length} icon={Package} />
        <Stat label="Low-Value" value={lowValue} icon={Package} />
        <Stat label="High-Value" value={highValue} icon={Package} />
        <Stat label="Low / out of stock" value={lowStock} icon={Warehouse} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-2">
        <section className="surface p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display break-words text-xl sm:text-2xl">What to do next</h2>
          </div>
          <div className="space-y-3 text-sm">
            {can("encode") ? (
              <Link href="/properties/new" className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-[var(--border)] p-3 text-[var(--text)] transition hover:border-[#9564DD] hover:bg-[#FDF4D2]/60">
                Add a property <ArrowRight className="h-4 w-4 shrink-0 text-[#9564DD]" />
              </Link>
            ) : (
              <Link href="/properties" className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-[var(--border)] p-3 text-[var(--text)] transition hover:border-[#9564DD] hover:bg-[#FDF4D2]/60">
                Review property records <ArrowRight className="h-4 w-4 shrink-0 text-[#9564DD]" />
              </Link>
            )}
            <Link href="/assignments" className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-[var(--border)] p-3 text-[var(--text)] transition hover:border-[#9564DD] hover:bg-[#FDF4D2]/60">
              Assignments <ArrowRight className="h-4 w-4 shrink-0 text-[#9564DD]" />
            </Link>
            <Link href="/audit" className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-[var(--border)] p-3 text-[var(--text)] transition hover:border-[#9564DD] hover:bg-[#FDF4D2]/60">
              Activity <ArrowRight className="h-4 w-4 shrink-0 text-[#9564DD]" />
            </Link>
          </div>
        </section>

        <section className="surface p-4 sm:p-5">
          <h2 className="font-display break-words text-xl sm:text-2xl">Assignments</h2>
          <div className="mt-4 space-y-3">
            {myAssignments.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No assignments yet.</p>
            ) : (
              myAssignments.map((a) => {
                const p = schoolProperties.find((x) => x.id === a.propertyId);
                return (
                  <Link key={a.id} href="/assignments" className="block border border-[var(--border)] p-3 text-sm text-[var(--text)]">
                    <p>{p?.description || "Property"}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {a.status}
                      {a.deadline ? ` · Deadline ${a.deadline}` : ""}
                    </p>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-2">
        <section className="surface p-4 sm:p-5">
          <h2 className="font-display break-words text-xl sm:text-2xl">Notifications</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{unreadNotifications.length} unread</p>
          <div className="mt-4 space-y-3">
            {unreadNotifications.slice(0, 5).map((n) => (
              <div key={n.id} className="rounded-lg border border-[var(--border)] bg-[#FDF4D2]/40 p-3">
                <p className="break-words text-sm">{n.title}</p>
                <p className="mt-1 break-words text-xs text-[var(--text-muted)]">{n.body}</p>
              </div>
            ))}
            {unreadNotifications.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No unread notifications.</p> : null}
          </div>
        </section>
      </div>

      <section className="surface mt-6 p-4 sm:p-5">
        <h2 className="font-display break-words text-xl sm:text-2xl">Recent property activity</h2>
        <div className="mt-4 space-y-3">
          {recentHistory.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No property history yet.</p>
          ) : (
            recentHistory.map((h) => (
              <div key={h.id} className="flex flex-col gap-1 border-b border-[var(--border)] pb-3 text-sm last:border-0">
                <p>{h.summary}</p>
                <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">{h.action}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {recentAudit.length > 0 ? (
        <section className="surface mt-6 p-4 sm:p-5">
          <h2 className="font-display break-words text-xl sm:text-2xl">Activity</h2>
          <div className="mt-4 space-y-3">
            {recentAudit.map((a) => (
              <p key={a.id} className="border-b border-[var(--border)] pb-3 text-sm last:border-0">
                {a.action}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      {schoolSupplies.some((s) => s.status !== "available") ? (
        <section className="mt-6">
          <h2 className="font-display mb-3 break-words text-xl sm:text-2xl">Supply attention</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {schoolSupplies
              .filter((s) => s.status !== "available")
              .map((s) => (
                <div key={s.id} className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words">{s.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {s.currentQuantity} {s.unit}
                    </p>
                  </div>
                  {supplyStatusBadge(s.status)}
                </div>
              ))}
          </div>
        </section>
      ) : null}

      <p className="mt-8 hidden text-xs text-[var(--text-muted)]">{displayName(user)} · {classLabel("high_value")}</p>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Package }) {
  return (
    <div className="surface p-4 sm:p-5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FDF4D2]">
        <Icon className="h-4 w-4 text-[#9564DD]" />
      </span>
      <p className="font-display mt-3 text-3xl sm:mt-4 sm:text-4xl">{value}</p>
      <p className="mt-1 break-words text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
