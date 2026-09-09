"use client";

import { CheckCircle2, Info, X } from "lucide-react";

export type ToastItem = {
  id: string;
  title: string;
  body?: string;
  tone?: "success" | "error" | "info";
};

export function ToastHost({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(92vw,380px)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex gap-3 border border-[var(--border)] bg-[var(--bg-elevated)] p-3 shadow-xl"
          role="status"
        >
          {toast.tone === "error" ? (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F1E5A1]" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide">{toast.title}</p>
            {toast.body ? <p className="mt-1 text-xs text-[var(--text-muted)]">{toast.body}</p> : null}
          </div>
          <button type="button" onClick={() => onDismiss(toast.id)} className="text-[var(--text-muted)]" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
