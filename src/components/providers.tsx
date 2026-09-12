"use client";

import { AppProvider } from "@/components/app-provider";
import { PwaRegister } from "@/components/pwa-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <PwaRegister />
      {children}
    </AppProvider>
  );
}
