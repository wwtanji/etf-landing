"use client";

import type { ReactNode, Ref } from "react";
import { track } from "@/lib/analytics";

export type CtaLocation = "hero" | "calc_unlock" | "priips" | "sticky";

/** Bottom space kept free for the fixed bars (consent bar ≤ 88 px, §9.3; sticky CTA is shorter). */
const FIXED_BAR_RESERVE_PX = 88;

/** Anchor that scrolls smoothly with JS and works without it. Never focuses inputs (§3). */
export function ScrollLink({
  target,
  reveal,
  jump = false,
  location,
  testId,
  className,
  ref,
  children,
}: {
  target: string;
  /** Id of an element inside `target` whose bottom must end up above the fixed bars. */
  reveal?: string;
  /** Jump without smooth scrolling, so sections in between are not counted as viewed (§9.4). */
  jump?: boolean;
  /** When set, the click is a CTA and fires `cta_click`. */
  location?: CtaLocation;
  testId?: string;
  className?: string;
  ref?: Ref<HTMLAnchorElement>;
  children: ReactNode;
}) {
  return (
    <a
      ref={ref}
      href={`#${target}`}
      data-testid={testId}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        if (location) track("cta_click", { location });
        scrollToSection(target, { reveal, jump });
      }}
    >
      {children}
    </a>
  );
}

/**
 * Scrolls `id` to the top (respecting its scroll-margin). With `reveal`, scrolls further when
 * needed so that element's bottom sits above the fixed bottom bars.
 */
export function scrollToSection(
  id: string,
  { reveal: revealId, jump = false }: { reveal?: string; jump?: boolean } = {},
): void {
  const target = document.getElementById(id);
  if (!target) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior: ScrollBehavior = jump || reduceMotion ? "auto" : "smooth";
  const reveal = revealId ? document.getElementById(revealId) : null;
  if (!reveal) {
    target.scrollIntoView({ behavior, block: "start" });
    return;
  }
  const marginTop = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const targetTop = target.getBoundingClientRect().top + window.scrollY - marginTop;
  const revealBottom = reveal.getBoundingClientRect().bottom + window.scrollY;
  const revealTop = revealBottom - window.innerHeight + FIXED_BAR_RESERVE_PX;
  window.scrollTo({ top: Math.max(targetTop, revealTop), behavior });
}
