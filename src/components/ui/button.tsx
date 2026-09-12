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
          "bg-[#1a1a1e] text-white hover:-translate-y-0.5 hover:bg-[#9564DD] hover:text-white hover:shadow-[0_8px_24px_rgba(149,100,221,0.35)] focus-visible:outline-[#9564DD]",
        variant === "secondary" &&
          "border border-[var(--border)] bg-[#FFFFFF] text-[var(--text)] hover:border-[#9564DD] hover:bg-[#FDF4D2] hover:text-[#5e2fb0]",
        variant === "ghost" && "text-[var(--text-muted)] hover:bg-[#FDF4D2] hover:text-[#9564DD]",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Working…" : children}
    </button>
  );
}
