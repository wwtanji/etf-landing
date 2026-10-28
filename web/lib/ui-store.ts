import { useSyncExternalStore } from "react";
import { denyAnalyticsConsent, getAnalyticsConsent, grantAnalyticsConsent } from "@/lib/analytics";

import { UNLOCKED_STORAGE_KEY } from "@/lib/storage-keys";

const listeners = new Set<() => void>();
let unlockedMemory: boolean | null = null;
let consentBarReopened = false;
let unlockCtaInView = false;

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readUnlocked(): boolean {
  if (unlockedMemory === null) {
    try {
      unlockedMemory = window.localStorage.getItem(UNLOCKED_STORAGE_KEY) === "1";
    } catch (error) {
      console.warn("ui-store: localStorage unavailable", error);
      unlockedMemory = false;
    }
  }
  return unlockedMemory;
}

export function markUnlocked(): void {
  unlockedMemory = true;
  try {
    window.localStorage.setItem(UNLOCKED_STORAGE_KEY, "1");
  } catch (error) {
    console.warn("ui-store: could not persist unlock", error);
  }
  emit();
}

function readConsentBarOpen(): boolean {
  return consentBarReopened || getAnalyticsConsent() === "unset";
}

export function reopenConsentBar(): void {
  consentBarReopened = true;
  emit();
}

export function acceptAnalytics(): void {
  grantAnalyticsConsent();
  consentBarReopened = false;
  emit();
}

export function rejectAnalytics(): void {
  denyAnalyticsConsent();
  consentBarReopened = false;
  emit();
}

/** Set by the calculator's IntersectionObserver on `calc-unlock-cta` (sticky CTA hides meanwhile, §3). */
export function setUnlockCtaInView(inView: boolean): void {
  if (unlockCtaInView === inView) return;
  unlockCtaInView = inView;
  emit();
}

const serverFalse = () => false;

/** Server and first client render: locked; then reads localStorage. */
export function useUnlocked(): boolean {
  return useSyncExternalStore(subscribe, readUnlocked, serverFalse);
}

/** Server and first client render: hidden (no SSR flash for returning visitors). */
export function useConsentBarOpen(): boolean {
  return useSyncExternalStore(subscribe, readConsentBarOpen, serverFalse);
}

export function useUnlockCtaInView(): boolean {
  return useSyncExternalStore(subscribe, () => unlockCtaInView, serverFalse);
}
