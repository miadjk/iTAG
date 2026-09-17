"use client";

import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  title,
  message,
  details,
  confirmLabel = "Confirm",
  loading = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  details?: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="surface w-full max-w-md p-5 shadow-[0_16px_40px_rgba(26,26,30,0.18)]">
        <h2 id="confirm-dialog-title" className="font-display break-words text-2xl">
          {title}
        </h2>
        <p className="mt-3 text-sm text-[var(--text)]">{message}</p>
        {details ? <div className="mt-4 space-y-1 break-words text-sm text-[var(--text-muted)]">{details}</div> : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={loading} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" className="w-full sm:w-auto" loading={loading} onClick={() => void onConfirm()}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
