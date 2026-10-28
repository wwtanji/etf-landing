"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { formatDate, formatTer } from "@/lib/format";
import {
  DISTRIBUTION_LABELS,
  MATCH_LABELS,
  domicileLabel,
  fundSize,
  terDateNote,
} from "@/lib/labels";
import type { UcitsEtfView } from "@/lib/landing-data";

const TOAST_MS = 2000;

/** "stejný index jako SPY, IVV" badges, limited to `tickers`. */
function matchBadges(ucits: UcitsEtfView, tickers: string[]): string[] {
  const byMatch = { same: [] as string[], similar: [] as string[] };
  for (const ticker of tickers) {
    const match = ucits.index_match[ticker];
    if (match) byMatch[match].push(ticker);
  }
  return (["same", "similar"] as const)
    .filter((match) => byMatch[match].length > 0)
    .map((match) => `${MATCH_LABELS[match]} jako ${byMatch[match].join(", ")}`);
}

export function UcitsCard({ ucits, tickers }: { ucits: UcitsEtfView; tickers: string[] }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const toastTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  function showToast(state: "copied" | "failed") {
    setCopyState(state);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setCopyState("idle"), TOAST_MS);
  }

  async function copyIsin() {
    track("value_interact", { action: "copy_isin", isin: ucits.isin });
    try {
      await navigator.clipboard.writeText(ucits.isin);
      showToast("copied");
    } catch (error) {
      console.warn("copy ISIN failed", error);
      showToast("failed");
    }
  }

  const size = fundSize(ucits);

  return (
    <li data-testid={`ucits-row-${ucits.isin}`} className="ucits-card">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="font-display text-lg leading-snug font-semibold">{ucits.name}</h4>
        <span className="ticker-pill">{ucits.ticker}</span>
      </div>

      <div className="isin-row">
        <span className="text-[0.7rem] tracking-[0.12em] text-ink-soft uppercase">ISIN</span>
        <span className="isin">{ucits.isin}</span>
        <button
          type="button"
          data-testid={`copy-isin-${ucits.isin}`}
          className="copy-btn"
          onClick={copyIsin}
          aria-label={`Zkopírovat ISIN ${ucits.isin}`}
        >
          Kopírovat
        </button>
        <span role="status" className="copy-toast" data-visible={copyState !== "idle" || undefined}>
          {copyState === "copied" ? "Zkopírováno" : copyState === "failed" ? "Nelze kopírovat" : ""}
        </span>
      </div>

      <dl className="ucits-facts">
        <div>
          <dt>TER</dt>
          <dd>
            <strong>{formatTer(ucits.ter_pct)}</strong>
            <span className="fact-note">{terDateNote(ucits)}</span>
          </dd>
        </div>
        {size && (
          <div>
            <dt>Velikost</dt>
            <dd>
              {size.value}
              <span className="fact-note">
                {size.label} · Data k {formatDate(ucits.as_of_date)}
              </span>
            </dd>
          </div>
        )}
        <div className="col-span-2">
          <dt>Index</dt>
          <dd>
            {ucits.index}
            <span className="mt-1 flex flex-wrap gap-1.5">
              {matchBadges(ucits, tickers).map((badge) => (
                <span key={badge} className="match-badge">
                  {badge}
                </span>
              ))}
            </span>
            <span className="fact-note">
              {domicileLabel(ucits.domicile)} · {DISTRIBUTION_LABELS[ucits.distribution]}
            </span>
          </dd>
        </div>
      </dl>

      <a
        href={ucits.source_url}
        target="_blank"
        rel="noopener"
        data-testid={`ucits-source-${ucits.isin}`}
        className="link text-sm"
        onClick={() => track("value_interact", { action: "open_source", isin: ucits.isin })}
      >
        Zdroj: web emitenta ({ucits.issuer})
      </a>
    </li>
  );
}
