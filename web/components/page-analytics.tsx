"use client";

import { useEffect } from "react";
import { initAnalytics, track, type Variant } from "@/lib/analytics";

const SCROLL_DEPTHS = [25, 50, 75, 100] as const;
/** §9.4: 100 % means (scrollY + innerHeight) / scrollHeight ≥ 0.98. */
const FULL_DEPTH_RATIO = 0.98;
const SECTION_VISIBLE_RATIO = 0.5;

/** Page-level events: lp_view, scroll_depth, section_view. Renders nothing. */
export function PageAnalytics({ variant }: { variant: Variant }) {
  useEffect(() => {
    initAnalytics(variant);
    track("lp_view", { viewport_w: window.innerWidth });

    const reached = new Set<number>();
    function onScroll() {
      const ratio =
        (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      for (const depth of SCROLL_DEPTHS) {
        if (reached.has(depth)) continue;
        const threshold = depth === 100 ? FULL_DEPTH_RATIO : depth / 100;
        if (ratio >= threshold) {
          reached.add(depth);
          track("scroll_depth", { depth });
        }
      }
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // A section counts as viewed when ≥ 50 % of it is visible, or, for sections
    // taller than the viewport, when it fills ≥ 50 % of the viewport.
    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const section = (entry.target as HTMLElement).dataset.section;
          if (!section || seen.has(section) || !entry.rootBounds) continue;
          const fillsViewport =
            entry.intersectionRect.height >= entry.rootBounds.height * SECTION_VISIBLE_RATIO;
          if (entry.intersectionRatio >= SECTION_VISIBLE_RATIO || fillsViewport) {
            seen.add(section);
            track("section_view", { section });
            observer.unobserve(entry.target);
          }
        }
      },
      // Consecutive thresholds differ by ≤ 2×, so tall sections (up to 40 viewports) still trigger.
      { threshold: [0, 0.0125, 0.025, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5] },
    );
    for (const element of document.querySelectorAll<HTMLElement>("[data-section]")) {
      observer.observe(element);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [variant]);

  return null;
}
