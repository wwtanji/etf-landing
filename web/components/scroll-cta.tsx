"use client";

import type { ReactNode } from "react";
import { track } from "@/lib/analytics";

export type CtaLocation = "hero" | "calc_unlock" | "priips" | "sticky";

/** Anchor that scrolls smoothly with JS and works without it. Never focuses inputs (§3). */
export function ScrollLink({
  target,
  location,
  testId,
  className,
  children,
}: {
  target: string;
  /** When set, the click is a CTA and fires `cta_click`. */
  location?: CtaLocation;
  testId?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={`#${target}`}
      data-testid={testId}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        if (location) track("cta_click", { location });
        scrollToSection(target);
      }}
    >
      {children}
    </a>
  );
}

export function scrollToSection(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}
