import type { ReactNode } from "react";

/** Ledger-style kicker above a section heading: "01 — Kalkulačka poplatků". */
export function SectionLabel({ index, children }: { index: string; children: ReactNode }) {
  return (
    <p className="section-label">
      <span className="section-label-index">{index}</span>
      <span aria-hidden="true" className="section-label-rule" />
      <span>{children}</span>
    </p>
  );
}
