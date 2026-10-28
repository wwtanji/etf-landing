"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import { formatDate, formatTer } from "@/lib/format";
import { GROUP_LABELS, fundSize, groupEtfs, terDateNote } from "@/lib/labels";
import type { UsEtfView } from "@/lib/landing-data";
import { SECTION_IDS } from "@/lib/sections";
import { useLanding } from "@/components/landing-provider";
import { SectionLabel } from "@/components/section-label";

export function EtfTable() {
  const { etfs, retrievedAt } = useLanding();
  const [sortByTer, setSortByTer] = useState(false);
  const sections = sortByTer
    ? [{ label: null, etfs: [...etfs].sort((a, b) => a.ter_pct - b.ter_pct) }]
    : groupEtfs(etfs).map((g) => ({ label: GROUP_LABELS[g.group], etfs: g.etfs }));

  return (
    <section
      id={SECTION_IDS.table}
      data-testid="etf-table"
      data-section="etf_table"
      className="scroll-mt-4 px-5 py-12"
    >
      <div className="mx-auto max-w-xl md:max-w-4xl">
        <SectionLabel index="04">Srovnání</SectionLabel>
        <h2 className="font-display text-[1.75rem] leading-[1.1] font-semibold tracking-tight">
          Americká ETF z NYSE Arca vedle sebe
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Poplatek (TER), velikost fondu a datum, ke kterému údaj platí. U každého řádku odkaz na
          zdroj.
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="font-mono text-xs tracking-[0.12em] text-ink-soft uppercase">
            {etfs.length} ETF
          </span>
          <button
            type="button"
            data-testid="etf-sort-ter"
            aria-pressed={sortByTer}
            className="chip"
            onClick={() => setSortByTer((value) => !value)}
          >
            {sortByTer ? "Seřazeno podle TER ↑" : "Seřadit podle TER"}
          </button>
        </div>

        <div className="etf-head" aria-hidden="true">
          <span>ETF</span>
          <span>Index</span>
          <span>TER</span>
          <span>Velikost</span>
          <span>Zdroj</span>
        </div>

        {sections.map((section) => (
          <div key={section.label ?? "ter"} className="mt-6 md:mt-4">
            {section.label && <h3 className="etf-group">{section.label}</h3>}
            <ul>
              {section.etfs.map((etf) => (
                <EtfRow key={etf.ticker} etf={etf} showGroup={sortByTer} />
              ))}
            </ul>
          </div>
        ))}

        <p className="mt-6 text-[0.8125rem] leading-relaxed text-ink-soft">
          Údaje z webů emitentů (State Street, iShares/BlackRock, Vanguard). Staženo{" "}
          {formatDate(retrievedAt)}. Velikost fondu u Vanguardu je údaj za ETF třídu akcií.
        </p>
      </div>
    </section>
  );
}

function EtfRow({ etf, showGroup }: { etf: UsEtfView; showGroup: boolean }) {
  const size = fundSize(etf);
  return (
    <li data-testid={`etf-row-${etf.ticker}`} className="etf-row">
      <div className="etf-cell-name">
        <span className="ticker-pill">{etf.ticker}</span>
        <span className="etf-name">{etf.name}</span>
        {showGroup && <span className="match-badge">{GROUP_LABELS[etf.group]}</span>}
      </div>
      <div className="etf-cell-index">{etf.index}</div>
      <div className="etf-cell-ter">
        <span className="etf-mobile-label">TER </span>
        <strong>{formatTer(etf.ter_pct)}</strong>
        <span className="fact-note">{terDateNote(etf)}</span>
      </div>
      <div className="etf-cell-size">
        {size && (
          <>
            <span className="etf-mobile-label">Velikost </span>
            {size.value}
            <span className="fact-note">{size.label}</span>
          </>
        )}
        <span className="fact-note">Data k {formatDate(etf.as_of_date)}</span>
      </div>
      <div className="etf-cell-source">
        <a
          href={etf.source_url}
          target="_blank"
          rel="noopener"
          data-testid={`etf-source-${etf.ticker}`}
          className="link"
          onClick={() => track("source_click", { ticker: etf.ticker })}
        >
          web emitenta
        </a>
      </div>
    </li>
  );
}
