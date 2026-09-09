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
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker ? <p className="text-[11px] uppercase tracking-[0.22em] text-[#F1E5A1]">{kicker}</p> : null}
        <h1 className="font-display mt-2 text-4xl sm:text-5xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-sm text-[var(--text-muted)]">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}
