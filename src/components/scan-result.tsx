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
    <section className="surface overflow-hidden p-4 sm:p-5">
      <h2 className="font-display break-words text-2xl sm:text-3xl">{title}</h2>
      <div className="mt-4 space-y-1.5 text-sm leading-relaxed text-[var(--text)] sm:mt-5">
        {lines.map(([label, value]) => (
          <p key={label} className="break-words">
            <span className="font-medium">{label}:</span> {value || "—"}
          </p>
        ))}
      </div>
    </section>
  );
}
