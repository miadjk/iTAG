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
        "inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] uppercase tracking-[0.14em]",
        tone === "neutral" && "border-[var(--border)] text-[var(--text-muted)]",
        tone === "accent" && "border-[#c4b15a] bg-[#F1E5A1] text-black",
        tone === "warn" && "border-amber-700 text-amber-800 dark:border-amber-500/50 dark:text-amber-400",
        tone === "danger" && "border-red-700 text-red-800 dark:border-red-500/40 dark:text-red-400",
        tone === "ok" && "border-emerald-700 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-400",
      )}
    >
      {Icon ? <Icon className="h-3 w-3" aria-hidden /> : null}
      {label}
    </span>
  );
}
