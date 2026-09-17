"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { propertyQrPayload } from "@/lib/qr";
import type { PropertyClassification, PropertyStatus } from "@/types";

export function QrCard({
  property,
}: {
  property: {
    id: string;
    description: string;
    qrCode: string;
    inventoryItemNumber?: string;
    permanentId?: string;
    qrVersion?: number;
    classification?: PropertyClassification;
    icsNumber?: string;
    unitCost?: number;
    totalCost?: number;
    fundSource?: string;
    location?: string;
    currentAccountablePerson?: string;
    custodianLastUser?: string;
    status?: PropertyStatus | string;
    dateAcquired?: string;
    updatedAt?: string;
  };
}) {
  const [src, setSrc] = useState("");
  const payload = propertyQrPayload(property);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payload, {
      margin: 1,
      width: 360,
      errorCorrectionLevel: "M",
      color: { dark: "#1a1a1e", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  function download() {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `${property.permanentId || property.inventoryItemNumber || property.id}-qr-v${property.qrVersion || 1}.png`;
    a.click();
  }

  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">QR code</p>
      <p className="mt-1 break-words text-sm text-[var(--text)]">{property.description}</p>
      <p className="mt-1 break-words text-xs text-[var(--text-muted)]">
        {property.permanentId || property.inventoryItemNumber}
        {property.qrVersion ? ` · QR v${property.qrVersion}` : ""}
      </p>
      {src ? (
        <img
          src={src}
          alt={`QR code for ${property.description}`}
          className="mx-auto mt-4 h-auto w-full max-w-48 rounded-lg border border-[var(--border)] bg-white p-2"
        />
      ) : null}
      <p className="mt-3 break-all text-[11px] text-[var(--text-muted)]">{payload}</p>
      <p className="mt-2 text-[11px] text-[var(--text-muted)]">
        Self-contained offline QR. Scan with any phone camera — no internet required.
      </p>
      <Button type="button" className="mt-4 w-full" onClick={download}>
        Save QR image
      </Button>
    </div>
  );
}
