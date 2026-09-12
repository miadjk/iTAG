import { clsx } from "@/lib/clsx";
import type { LucideIcon } from "lucide-react";

export function StatusBadge({
  label,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  icon?: LucideIcon;
  tone?: "neutral" | "accent" | "warn" | "danger" | "ok";
}) {
  return (
    <span
      className={clsx(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]",
        tone === "neutral" && "border-[var(--border)] bg-[#FFFFFF] text-[var(--text-muted)]",
        tone === "accent" && "border-[#e7dfc2] bg-[#FDF4D2] text-[#5e2fb0]",
        tone === "warn" && "border-amber-300 bg-amber-50 text-amber-800",
        tone === "danger" && "border-red-300 bg-red-50 text-red-800",
        tone === "ok" && "border-emerald-300 bg-emerald-50 text-emerald-800",
      )}
    >
      {Icon ? <Icon className="h-3 w-3 shrink-0" aria-hidden /> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}
