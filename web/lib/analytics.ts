import { readUtm } from "@/lib/utm";
import { CONSENT_STORAGE_KEY } from "@/lib/storage-keys";

/** Event contract, plan §9.4. */
export type EventName =
  | "lp_view"
  | "scroll_depth"
  | "section_view"
  | "value_view"
  | "form_view"
  | "calc_interact"
  | "calc_result"
  | "cta_click"
  | "form_start"
  | "form_submit"
  | "form_error"
  | "lead_success"
  | "value_interact"
  | "source_click";

export type EventProps = Record<string, string | number | boolean>;
export type Variant = "a" | "b";
export type AnalyticsConsent = "granted" | "denied" | "unset";

type LpEvent = { name: EventName; props: EventProps; ts: number };

declare global {
  interface Window {
    __lpEvents?: LpEvent[];
    umami?: { track: (name: string, data?: EventProps) => void };
  }
}

const QUEUE_MAX = 50;

let commonProps: EventProps | null = null;
let consent: AnalyticsConsent | null = null;
/** Events tracked while consent is unset (or before init). */
let queue: { name: EventName; props: EventProps }[] = [];
/** Events sent while the Umami script is still loading. */
let umamiPending: { name: EventName; props: EventProps }[] = [];
let umamiState: "none" | "loading" | "loaded" = "none";

function readStoredConsent(): AnalyticsConsent {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : "unset";
  } catch (error) {
    // Storage blocked (e.g. privacy mode): keep consent in memory only.
    console.warn("analytics: localStorage unavailable", error);
    return "unset";
  }
}

function storeConsent(value: "granted" | "denied"): void {
  consent = value;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch (error) {
    console.warn("analytics: could not persist consent", error);
  }
}

export function getAnalyticsConsent(): AnalyticsConsent {
  if (consent === null) consent = readStoredConsent();
  return consent;
}

function loadUmami(): void {
  if (umamiState !== "none") return;
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const scriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
  if (!websiteId || !scriptUrl) return;
  umamiState = "loading";
  const script = document.createElement("script");
  script.defer = true;
  script.src = scriptUrl;
  script.dataset.websiteId = websiteId;
  const domains = process.env.NEXT_PUBLIC_UMAMI_DOMAINS;
  if (domains) script.dataset.domains = domains;
  script.onload = () => {
    umamiState = "loaded";
    const pending = umamiPending;
    umamiPending = [];
    for (const event of pending) window.umami?.track(event.name, event.props);
  };
  document.head.appendChild(script);
}

function send(name: EventName, props: EventProps): void {
  window.__lpEvents ??= [];
  window.__lpEvents.push({ name, props, ts: Date.now() });
  if (umamiState === "loaded") window.umami?.track(name, props);
  else if (umamiState === "loading") umamiPending.push({ name, props });
}

function flushQueue(): void {
  const queued = queue;
  queue = [];
  for (const event of queued) send(event.name, { ...commonProps, ...event.props });
}

/** Call once on landing mount, before any other event. Reads UTMs once. */
export function initAnalytics(variant: Variant): void {
  if (commonProps) return;
  const utm = readUtm();
  commonProps = { variant };
  for (const [key, value] of Object.entries(utm)) commonProps[`utm_${key}`] = value;
  if (getAnalyticsConsent() === "granted") {
    loadUmami();
    flushQueue();
  }
}

export function track(name: EventName, props: EventProps = {}): void {
  const state = getAnalyticsConsent();
  if (state === "denied") return;
  if (state === "unset" || !commonProps) {
    queue.push({ name, props });
    if (queue.length > QUEUE_MAX) queue.shift();
    return;
  }
  send(name, { ...commonProps, ...props });
}

export function grantAnalyticsConsent(): void {
  storeConsent("granted");
  loadUmami();
  if (commonProps) flushQueue();
}

export function denyAnalyticsConsent(): void {
  storeConsent("denied");
  queue = [];
}
