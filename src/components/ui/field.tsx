import { clsx } from "@/lib/clsx";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block space-y-2">
      <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</span>
      <div className={error ? "ring-2 ring-red-600 ring-offset-2 ring-offset-[var(--bg-elevated)]" : undefined}>
        {children}
      </div>
      {hint && !error ? <span className="block text-[11px] text-[var(--text-muted)]">{hint}</span> : null}
      {error ? <span className="block text-[11px] text-red-700 dark:text-red-400">{error}</span> : null}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "h-11 w-full border border-[var(--border)] bg-[var(--bg-muted)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        "h-11 w-full border border-[var(--border)] bg-[var(--bg-muted)] px-3 text-sm text-[var(--text)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        "min-h-24 w-full border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-sm text-[var(--text)]",
        className,
      )}
      {...props}
    />
  );
}
