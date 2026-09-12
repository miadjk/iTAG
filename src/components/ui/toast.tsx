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
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[80] flex flex-col gap-2 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[min(92vw,380px)]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex gap-3 rounded-xl border border-[var(--border)] bg-[#FFFFFF] p-3 shadow-xl"
          role="status"
        >
          {toast.tone === "error" ? (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#3F3FA3]" />
          )}
          <div className="min-w-0 flex-1">
            <p className="break-words text-xs uppercase tracking-wide">{toast.title}</p>
            {toast.body ? <p className="mt-1 break-words text-xs text-[var(--text-muted)]">{toast.body}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[#FFFFD3] hover:text-[#1a1a1e]"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
