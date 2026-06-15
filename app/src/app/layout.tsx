import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: '--font-jetbrains' });
const notoSansDevanagari = Noto_Sans_Devanagari({ weight: ['400'], subsets: ["devanagari"], variable: '--font-noto-devanagari' });

export const metadata: Metadata = {
  title: "Uphar CRM",
  description: "Specimen Distribution CRM for Uphar Prakashan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${notoSansDevanagari.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
