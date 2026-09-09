import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center justify-center px-6 py-16 text-center">
      <Icon className="mb-4 h-8 w-8 text-[#F1E5A1]" />
      <h2 className="font-display text-3xl">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[var(--bg-muted)] ${className ?? "h-24"}`} />;
}
