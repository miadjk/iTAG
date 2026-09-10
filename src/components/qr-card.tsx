"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { propertyQrPayload } from "@/lib/qr";

export function QrCard({
  property,
}: {
  property: { id: string; description: string; qrCode: string; inventoryItemNumber?: string };
}) {
  const [src, setSrc] = useState("");
  const payload = propertyQrPayload(property.qrCode);

  useEffect(() => {
    QRCode.toDataURL(payload, {
      margin: 1,
      width: 360,
      errorCorrectionLevel: "M",
      color: { dark: "#111111", light: "#ffffff" },
    }).then(setSrc);
  }, [payload]);

  function download() {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `${property.inventoryItemNumber || property.id}-qr.png`;
    a.click();
  }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">QR code</p>
      <p className="mt-1 text-sm text-[var(--text)]">{property.description}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{property.inventoryItemNumber}</p>
      {src ? <img src={src} alt={`QR code for ${property.description}`} className="mx-auto mt-4 w-48 bg-white p-2" /> : null}
      <p className="mt-3 break-all text-[11px] text-[var(--text-muted)]">{payload}</p>
      <Button type="button" className="mt-4 w-full" onClick={download}>
        Save QR image
      </Button>
    </div>
  );
}
