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
    <div className="block min-w-0 space-y-2">
      <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</span>
      <div className={error ? "rounded-lg ring-2 ring-red-600 ring-offset-2 ring-offset-white" : undefined}>
        {children}
      </div>
      {hint && !error ? <span className="block text-[11px] text-[var(--text-muted)]">{hint}</span> : null}
      {error ? <span className="block text-[11px] text-red-700">{error}</span> : null}
    </div>
  );
}

const controlBase =
  "min-h-11 w-full rounded-lg border border-[var(--border)] bg-[#FFFFFF] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] transition focus:border-[#3F3FA3] focus:outline-none focus:ring-2 focus:ring-[#D3D3FF]";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(controlBase, "h-11", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(controlBase, "h-11", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(controlBase, "min-h-24 py-2", className)} {...props} />;
}
