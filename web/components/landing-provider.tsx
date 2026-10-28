"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Variant } from "@/lib/analytics";
import { DEFAULT_AMOUNT_CZK, DEFAULT_ETF_A, DEFAULT_ETF_B, DEFAULT_YEARS } from "@/lib/fees";
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
  /** Calculator's last valid amount (CZK) and horizon; the thank-you fee line reuses them. */
  amount: number;
  years: number;
  setAmount: (amount: number) => void;
  setYears: (years: number) => void;
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
  const [amount, setAmount] = useState(DEFAULT_AMOUNT_CZK);
  const [years, setYears] = useState(DEFAULT_YEARS);
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
      amount,
      years,
      setAmount,
      setYears,
    }),
    [variant, retrievedAt, etfs, ucits, etfA, etfB, amount, years],
  );
  return <LandingContext.Provider value={value}>{children}</LandingContext.Provider>;
}

export function useLanding(): LandingContextValue {
  const value = useContext(LandingContext);
  if (!value) throw new Error("useLanding must be used inside <LandingProvider>");
  return value;
}

/** UCITS twins of the given US tickers, unique, ordered by TER ascending, then dataset order. */
export function twinsOf(
  tickers: string[],
  etfByTicker: Map<string, UsEtfView>,
  ucitsByIsin: Map<string, UcitsEtfView>,
): UcitsEtfView[] {
  const isins = new Set(tickers.flatMap((t) => etfByTicker.get(t)?.ucits_twin_ids ?? []));
  // Map iteration follows dataset order; Array.prototype.sort is stable.
  return [...ucitsByIsin.values()]
    .filter((u) => isins.has(u.isin))
    .sort((a, b) => a.ter_pct - b.ter_pct);
}
