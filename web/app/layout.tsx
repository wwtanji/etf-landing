import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { ConsentBar } from "@/components/consent-bar";
import "./globals.css";

const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
});

const sans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stejný index, jiný poplatek: srovnání ETF z NYSE Arca",
  description:
    "Spočítejte si, kolik vás stojí roční poplatek (TER) u ETF se stejným indexem. Data od emitentů se zdrojem a datem. Vzdělávací srovnání, ne investiční doporučení.",
};

export const viewport: Viewport = {
  themeColor: "#f3eee3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        {children}
        <ConsentBar />
      </body>
    </html>
  );
}
