"use client";

import { AppProvider } from "@/components/app-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { PwaRegister } from "@/components/pwa-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppProvider>
        <PwaRegister />
        {children}
      </AppProvider>
    </ThemeProvider>
  );
}
