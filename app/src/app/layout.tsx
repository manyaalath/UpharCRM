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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${notoSansDevanagari.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
