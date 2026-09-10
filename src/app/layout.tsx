import type { Metadata, Viewport } from "next";
import { EB_Garamond, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const display = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "iTAG",
  description:
    "Inventory Tracking and Property Management System for schools. Encode properties, generate QR codes, and preserve accountability history.",
  applicationName: "iTAG",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "iTAG",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${display.variable} ${mono.variable} antialiased`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
