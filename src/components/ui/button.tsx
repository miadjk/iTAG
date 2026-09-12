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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs uppercase tracking-[0.14em] transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-[#D3D3FF] text-[#1a1a1e] hover:-translate-y-0.5 hover:bg-[#FFFFD3] hover:text-[#1a1a1e] hover:shadow-[0_8px_24px_rgba(63,63,163,0.22)] focus-visible:outline-[#3F3FA3]",
        variant === "secondary" &&
          "border border-[var(--border)] bg-[#FFFFFF] text-[var(--text)] hover:border-[#D3D3FF] hover:bg-[#FFFFD3] hover:text-[#1a1a1e]",
        variant === "ghost" && "text-[var(--text-muted)] hover:bg-[#FFFFD3] hover:text-[#1a1a1e]",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Working…" : children}
    </button>
  );
}
