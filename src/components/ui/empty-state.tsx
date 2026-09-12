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
    <div className="surface flex flex-col items-center justify-center px-5 py-12 text-center sm:px-6 sm:py-16">
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#D3D3FF]/50">
        <Icon className="h-7 w-7 text-[#3F3FA3]" />
      </span>
      <h2 className="font-display break-words text-2xl sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-md break-words text-sm text-[var(--text-muted)]">{body}</p>
      {action ? <div className="mt-6 w-full max-w-xs sm:w-auto sm:max-w-none">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#D3D3FF]/40 ${className ?? "h-24"}`} />;
}
