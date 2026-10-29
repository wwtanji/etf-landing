import type { ReactNode } from "react";

/** Small muted kicker above a section heading. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="section-label">{children}</p>;
}
