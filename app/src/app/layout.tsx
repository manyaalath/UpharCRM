import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import PwaRegister from "@/components/pwa/PwaRegister";
import "./globals.css";

// Self-hosted (woff2 from Fontsource, all SIL OFL). Fetching from Google at build
// time broke Turbopack builds on Vercel, and local files also work offline in the PWA.
const plexSans = localFont({
  variable: "--font-plex-sans",
  display: "swap",
  src: [
    { path: "./fonts/plex-sans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/plex-sans-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/plex-sans-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/plex-sans-700.woff2", weight: "700", style: "normal" },
  ],
});
const plexMono = localFont({
  variable: "--font-plex-mono",
  display: "swap",
  src: [
    { path: "./fonts/plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/plex-mono-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/plex-mono-600.woff2", weight: "600", style: "normal" },
  ],
});
const sourceSerif = localFont({
  variable: "--font-source-serif",
  display: "swap",
  src: [
    { path: "./fonts/source-serif-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/source-serif-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/source-serif-700.woff2", weight: "700", style: "normal" },
  ],
});
// The Devanagari wordmark, bold only. Devanagari subset; Latin falls through to
// IBM Plex Sans (see --font-deva in globals.css).
const mukta = localFont({
  variable: "--font-mukta",
  display: "swap",
  src: [{ path: "./fonts/mukta-700.woff2", weight: "700", style: "normal" }],
});

export const metadata: Metadata = {
  title: { default: "Uphar CRM", template: "%s · Uphar CRM" },
  description: "Specimen distribution CRM for Uphar Prakashan: challans, leads, follow-up calls and district analytics.",
  applicationName: "Uphar CRM",
  appleWebApp: { capable: true, title: "Uphar CRM", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false }, // internal tool
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets us pad for notches and the home indicator
  themeColor: "#f7f5f0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plexSans.variable} ${plexMono.variable} ${sourceSerif.variable} ${mukta.variable} antialiased`}>
        {children}
        <PwaRegister />
        <Toaster
          position="bottom-right"
          mobileOffset={{ bottom: "calc(var(--nav-h) + var(--safe-b) + 12px)", left: 12, right: 12 }}
          toastOptions={{
            className: "!font-sans !text-[13px] !rounded-md !border-line !shadow-[var(--shadow-pop)]",
          }}
        />
      </body>
    </html>
  );
}
