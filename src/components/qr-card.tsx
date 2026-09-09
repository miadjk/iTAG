"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import type { PropertyRecord } from "@/types";

export function QrCard({ property }: { property: Pick<PropertyRecord, "id" | "description" | "qrCode" | "propertyNumber"> }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    QRCode.toDataURL(property.qrCode, { margin: 1, width: 360, color: { dark: "#111111", light: "#F1E5A1" } }).then(setSrc);
  }, [property.qrCode]);

  function download() {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `${property.propertyNumber || property.id}-qr.png`;
    a.click();
  }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">QR code</p>
      <p className="mt-1 text-sm text-[var(--text)]">{property.description}</p>
      {src ? <img src={src} alt={`QR code for ${property.description}`} className="mx-auto mt-4 w-48 bg-white p-2" /> : null}
      <Button type="button" className="mt-4 w-full" onClick={download}>
        Save QR image
      </Button>
    </div>
  );
}
