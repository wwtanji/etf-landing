import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ConsentBar } from "@/components/consent-bar";
import "./globals.css";

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stejný index, jiný poplatek: srovnání ETF z NYSE Arca",
  description:
    "Spočítejte si, kolik vás stojí roční poplatek (TER) u ETF se stejným indexem. Data od emitentů se zdrojem a datem. Vzdělávací srovnání, ne investiční doporučení.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs" className={sans.variable}>
      <body>
        {children}
        <ConsentBar />
      </body>
    </html>
  );
}
