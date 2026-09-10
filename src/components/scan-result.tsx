import { propertyScanLines, type QrPropertyView } from "@/lib/qr";

export function ScanResult({
  property,
  title = "Scan result",
}: {
  property: QrPropertyView;
  title?: string;
}) {
  const lines = propertyScanLines(property);
  return (
    <section className="surface overflow-hidden p-5">
      <h2 className="font-display text-3xl">{title}</h2>
      <div className="mt-5 space-y-1.5 text-sm leading-relaxed text-[var(--text)]">
        {lines.map(([label, value]) => (
          <p key={label} className="break-words">
            <span className="font-medium">{label}:</span>
            {value || "—"}
          </p>
        ))}
      </div>
    </section>
  );
}
