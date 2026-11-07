import type { Metadata, Viewport } from "next";
import "@fontsource-variable/montserrat";
import "./globals.css";
import { businessConfig as b } from "@/config/business";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${b.displayName} | Heating, cooling & HVAC repair`, template: `%s | ${b.displayName}` },
  description: `Heating, cooling, repairs, and seasonal maintenance for ${b.serviceAreaLabel}. ${b.primaryTagline}`,
  openGraph: { type: "website", siteName: b.displayName, locale: "en_US" },
  // Prelaunch: keep the preview out of search indexes until the owner approves launch.
  robots: b.siteMode === "live" ? { index: true, follow: true } : { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#252B2D", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
