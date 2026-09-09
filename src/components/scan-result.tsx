import { formatMoney } from "@/lib/utils";
import type { PropertyRecord } from "@/types";

export function ScanResult({ property, title = "Property details" }: { property: PropertyRecord; title?: string }) {
  return (
    <section className="surface p-5">
      <h2 className="font-display text-3xl">{title}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Meta label="Entity" value={property.entityName} />
      <Meta label="ICS No." value={property.icsNumber} />
      <Meta label="Item No." value={property.inventoryItemNumber} />
      <Meta label="Description" value={property.description} />
      <Meta label="Date acquired" value={property.dateAcquired} />
      <Meta label="Unit measure" value={property.unitOfMeasure} />
      <Meta label="Quantity" value={String(property.quantity)} />
      <Meta label="Unit cost" value={formatMoney(property.unitCost)} />
      <Meta label="Total cost" value={formatMoney(property.totalCost)} />
      <Meta label="Custodian / last user" value={property.custodianLastUser} />
      <Meta label="Fund source" value={property.fundSource} />
      <Meta label="Useful life" value={property.estimatedUsefulLife} />
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--text)]">{value || "—"}</p>
    </div>
  );
}
