"use client";

import { useEffect, useState } from "react";
import { SECTION_IDS } from "@/lib/sections";
import { useConsentBarOpen, useUnlocked } from "@/lib/ui-store";
import { ScrollLink } from "@/components/scroll-cta";

/** Bottom bar (§3): only after the hero scrolled away; hidden while the form is in view, after unlock and while the consent bar shows. */
export function StickyCta() {
  const unlocked = useUnlocked();
  const consentBarOpen = useConsentBarOpen();
  const [heroVisible, setHeroVisible] = useState(true);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(SECTION_IDS.hero);
    const form = document.getElementById(SECTION_IDS.form);
    if (!hero || !form) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) setHeroVisible(entry.isIntersecting);
        if (entry.target === form) setFormVisible(entry.isIntersecting);
      }
    });
    observer.observe(hero);
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  if (heroVisible || formVisible || unlocked || consentBarOpen) return null;

  return (
    <div className="sticky-cta">
      <ScrollLink
        target={SECTION_IDS.form}
        location="sticky"
        testId="sticky-cta"
        className="btn btn-stamp w-full"
      >
        Odemknout evropské protějšky
      </ScrollLink>
    </div>
  );
}
