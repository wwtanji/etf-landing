"use client";

import {
  acceptAnalytics,
  rejectAnalytics,
  reopenConsentBar,
  useConsentBarOpen,
} from "@/lib/ui-store";

/** Footer link "Nastavení měření": reopens the consent bar (§5.7). */
export function ConsentSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      data-testid="consent-settings"
      className={className}
      onClick={reopenConsentBar}
    >
      Nastavení měření
    </button>
  );
}

/** Non-modal analytics consent bar (§9.3), ≤ 88 px tall. */
export function ConsentBar() {
  const open = useConsentBarOpen();
  if (!open) return null;
  return (
    <div
      data-testid="consent-bar"
      role="region"
      aria-label="Souhlas s měřením"
      className="consent-bar"
    >
      <p className="consent-bar-text">
        Smíme měřit, jak se stránka používá? Statistiky bez cookies přes Umami, jen se souhlasem.
      </p>
      <div className="consent-bar-actions">
        <a href="/soukromi" className="link text-xs">
          Více
        </a>
        <button
          type="button"
          data-testid="consent-reject"
          className="consent-btn"
          onClick={rejectAnalytics}
        >
          Odmítnout
        </button>
        <button
          type="button"
          data-testid="consent-accept"
          className="consent-btn consent-btn-primary"
          onClick={acceptAnalytics}
        >
          Povolit
        </button>
      </div>
    </div>
  );
}
