import { clsx } from "@/lib/clsx";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
};

export function Button({ className, variant = "primary", loading, disabled, children, ...props }: Props) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-11 items-center justify-center gap-2 px-4 text-xs uppercase tracking-[0.14em] transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-[#F1E5A1] text-black hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(241,229,161,0.18)]",
        variant === "secondary" &&
          "border border-[var(--border)] bg-transparent text-[var(--text)] hover:border-[#F1E5A1] hover:text-[#F1E5A1]",
        variant === "ghost" && "text-[var(--text-muted)] hover:text-[#F1E5A1]",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Working…" : children}
    </button>
  );
}
