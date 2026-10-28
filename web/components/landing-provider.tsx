"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Variant } from "@/lib/analytics";
import { DEFAULT_ETF_A, DEFAULT_ETF_B } from "@/lib/fees";
import type { UcitsEtfView, UsEtfView } from "@/lib/landing-data";

type LandingContextValue = {
  variant: Variant;
  retrievedAt: string;
  etfs: UsEtfView[];
  ucits: UcitsEtfView[];
  etfByTicker: Map<string, UsEtfView>;
  ucitsByIsin: Map<string, UcitsEtfView>;
  etfA: string;
  etfB: string;
  setEtfA: (ticker: string) => void;
  setEtfB: (ticker: string) => void;
};

const LandingContext = createContext<LandingContextValue | null>(null);

export function LandingProvider({
  variant,
  retrievedAt,
  etfs,
  ucits,
  children,
}: {
  variant: Variant;
  retrievedAt: string;
  etfs: UsEtfView[];
  ucits: UcitsEtfView[];
  children: ReactNode;
}) {
  const [etfA, setEtfA] = useState(DEFAULT_ETF_A);
  const [etfB, setEtfB] = useState(DEFAULT_ETF_B);
  const value = useMemo<LandingContextValue>(
    () => ({
      variant,
      retrievedAt,
      etfs,
      ucits,
      etfByTicker: new Map(etfs.map((e) => [e.ticker, e])),
      ucitsByIsin: new Map(ucits.map((u) => [u.isin, u])),
      etfA,
      etfB,
      setEtfA,
      setEtfB,
    }),
    [variant, retrievedAt, etfs, ucits, etfA, etfB],
  );
  return <LandingContext.Provider value={value}>{children}</LandingContext.Provider>;
}

export function useLanding(): LandingContextValue {
  const value = useContext(LandingContext);
  if (!value) throw new Error("useLanding must be used inside <LandingProvider>");
  return value;
}

/** UCITS twins of the given US tickers, unique, ordered by TER ascending. */
export function twinsOf(
  tickers: string[],
  etfByTicker: Map<string, UsEtfView>,
  ucitsByIsin: Map<string, UcitsEtfView>,
): UcitsEtfView[] {
  const isins = new Set(tickers.flatMap((t) => etfByTicker.get(t)?.ucits_twin_ids ?? []));
  return [...isins]
    .map((isin) => ucitsByIsin.get(isin))
    .filter((u): u is UcitsEtfView => u !== undefined)
    .sort((a, b) => a.ter_pct - b.ter_pct);
}
