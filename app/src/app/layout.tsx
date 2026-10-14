import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Source_Serif_4, Mukta } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-source-serif" });
const mukta = Mukta({ subsets: ["devanagari", "latin"], weight: ["500", "700"], variable: "--font-mukta" });

export const metadata: Metadata = {
  title: "Uphar CRM",
  description: "Specimen distribution CRM for Uphar Prakashan",
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
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: "!font-sans !text-[13px] !rounded-md !border-line !shadow-[var(--shadow-pop)]",
          }}
        />
      </body>
    </html>
  );
}
