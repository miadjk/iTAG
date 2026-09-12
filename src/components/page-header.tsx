export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {kicker ? <p className="text-[11px] uppercase tracking-[0.22em] text-[#3F3FA3]">{kicker}</p> : null}
        <h1 className="font-display mt-2 break-words text-3xl sm:text-4xl lg:text-5xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl break-words text-sm text-[var(--text-muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 [&_a]:w-full [&_a]:sm:w-auto [&_button]:w-full [&_button]:sm:w-auto">{actions}</div> : null}
    </div>
  );
}
