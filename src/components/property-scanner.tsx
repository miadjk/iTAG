"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ScanResult } from "@/components/scan-result";
import { useApp } from "@/lib/app-context";
import type { PropertyRecord } from "@/types";

export function PropertyScanner({ onClose }: { onClose?: () => void }) {
  const { findPropertyByQr } = useApp();
  const [manual, setManual] = useState("");
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [result, setResult] = useState<PropertyRecord | null>(null);
  const regionId = "qr-reader";
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (result) {
      scannerRef.current?.stop().catch(() => undefined);
      return;
    }
    let active = true;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          (decoded) => {
            const found = findPropertyByQr(decoded);
            if (found) setResult(found);
          },
          () => undefined,
        );
      } catch {
        if (active) setCameraError("Camera is unavailable. Enter the QR identifier instead.");
      }
    })();
    return () => {
      active = false;
      scannerRef.current?.stop().catch(() => undefined);
    };
  }, [findPropertyByQr, result]);

  if (result) {
    return (
      <div className="space-y-4">
        <ScanResult property={result} title="Scan result" />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setResult(null)}>
            Scan another
          </Button>
          {onClose ? (
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="surface p-4">
        <div id={regionId} className="min-h-48 overflow-hidden bg-black" />
        {cameraError ? <p className="mt-3 text-sm text-[var(--text-muted)]">{cameraError}</p> : null}
      </div>
      <form
        className="surface space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const found = findPropertyByQr(manual);
          if (!found) {
            setError("No matching property record.");
            return;
          }
          setResult(found);
        }}
      >
        <Field label="QR identifier or property number">
          <Input value={manual} onChange={(e) => setManual(e.target.value)} />
        </Field>
        {error ? <p className="text-sm text-red-800 dark:text-red-400">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Look up</Button>
          {onClose ? (
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
