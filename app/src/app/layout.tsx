import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Source_Serif_4, Mukta } from "next/font/google";
import { Toaster } from "sonner";
import PwaRegister from "@/components/pwa/PwaRegister";
import "./globals.css";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-source-serif" });
const mukta = Mukta({ subsets: ["devanagari", "latin"], weight: ["500", "700"], variable: "--font-mukta" });

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
