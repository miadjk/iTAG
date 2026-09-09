"use client";

import { PageHeader } from "@/components/page-header";
import { useApp } from "@/lib/app-context";
import { formatDate } from "@/lib/utils";

export default function AuditPage() {
  const { user, state, schoolUsers } = useApp();
  const schoolIds = new Set([user?.id, ...schoolUsers.map((u) => u.id)].filter(Boolean) as string[]);
  const schoolLogs = state.auditLogs.filter((l) => schoolIds.has(l.userId));
  const logs = user?.role === "school_head" ? schoolLogs : schoolLogs.filter((l) => l.userId === user?.id);

  return (
    <div>
      <PageHeader
        kicker="Accountability"
        title="Activity"
        description={
          user?.role === "school_head"
            ? "Login, property changes, transfers, stock movements, and account updates are recorded for this school."
            : "Your recorded actions remain available here."
        }
      />
      <div className="space-y-2">
        {logs.map((log) => (
          <article key={log.id} className="surface p-4 text-sm">
            <p>{log.action}</p>
            <p className="mt-1 text-[11px] uppercase tracking-widest text-[var(--text-muted)]">
              {log.recordType} · {formatDate(log.createdAt)}
              {log.previousValue ? ` · ${log.previousValue}` : ""}
              {log.newValue ? ` → ${log.newValue}` : ""}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
