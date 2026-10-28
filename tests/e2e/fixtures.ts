import { test as base, expect, type Locator, type Page, type Request } from "@playwright/test";
import { UMAMI_SCRIPT_URL } from "./constants";

export type LpEvent = { name: string; props?: Record<string, unknown>; ts?: number };

declare global {
  interface Window {
    __lpEvents?: LpEvent[];
    __umamiCalls?: { name: string; data?: unknown }[];
  }
}

/** Stub for the Umami tracker: records track() calls so tests can see what Umami would receive. */
const UMAMI_STUB = `
  window.__umamiCalls = window.__umamiCalls || [];
  window.umami = { track: function (name, data) { window.__umamiCalls.push({ name: name, data: data }); } };
`;

let ipCounter = 0;

type Fixtures = {
  /** Every POST /api/leads the page made. */
  leadRequests: Request[];
  /** Every request for the Umami script URL. */
  umamiScriptRequests: string[];
};

export const test = base.extend<Fixtures>({
  leadRequests: async ({ page }, use) => {
    const seen: Request[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST" && new URL(r.url()).pathname === "/api/leads") seen.push(r);
    });
    await use(seen);
  },
  umamiScriptRequests: async ({ page }, use) => {
    const seen: string[] = [];
    await page.route(UMAMI_SCRIPT_URL, async (route) => {
      seen.push(route.request().url());
      await route.fulfill({ status: 200, contentType: "application/javascript", body: UMAMI_STUB });
    });
    await use(seen);
  },
  page: async ({ page }, use) => {
    // Own rate-limit bucket per test (memory driver, 5 POST / 600 s per IP).
    ipCounter += 1;
    await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.77.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}` });
    // Never hit issuer sites from tests.
    await page.route(/^https:\/\/(www\.)?(ssga\.com|ishares\.com|investor\.vanguard\.com|europarl\.europa\.eu|justetf\.com)\//, (r) =>
      r.fulfill({ status: 200, contentType: "text/html", body: "<html><body>stub</body></html>" }),
    );
    await use(page);
  },
});

export { expect, type Page };

/** Collapse all whitespace (incl. U+00A0 / U+202F from cs-CZ formatting) to single spaces. */
export const norm = (s: string | null | undefined): string => (s ?? "").replace(/[\s\u00a0\u202f]+/g, " ").trim();

export async function textOf(loc: Locator): Promise<string> {
  return norm(await loc.innerText());
}

export async function lpEvents(page: Page): Promise<LpEvent[] | null> {
  return page.evaluate(() => window.__lpEvents ?? null);
}

export async function eventNames(page: Page): Promise<string[]> {
  return ((await lpEvents(page)) ?? []).map((e) => e.name);
}

/** Wait until an event matching the predicate has been recorded. */
export async function waitForEvent(page: Page, name: string, match: (p: Record<string, unknown>) => boolean = () => true) {
  await expect
    .poll(async () => ((await lpEvents(page)) ?? []).some((e) => e.name === name && match(e.props ?? {})), {
      message: `event ${name} should fire`,
      timeout: 8_000,
    })
    .toBe(true);
}

export async function acceptConsent(page: Page) {
  const bar = page.getByTestId("consent-bar");
  await expect(bar).toBeVisible();
  await page.getByTestId("consent-accept").click();
  await expect(bar).toBeHidden();
}

/** Select the <option> whose label starts with / contains the ticker (option values are not in the contract). */
export async function selectTicker(select: Locator, ticker: string) {
  const value = await select.evaluate((el, t) => {
    const opts = Array.from((el as HTMLSelectElement).options);
    const hit =
      opts.find((o) => o.value === t) ?? opts.find((o) => new RegExp(`(^|[^A-Z])${t}([^A-Z]|$)`).test(o.textContent ?? ""));
    return hit ? hit.value : null;
  }, ticker);
  expect(value, `option for ${ticker}`).not.toBeNull();
  await select.selectOption(value as string);
}

/** Stop real navigation for external links while letting the page's own click handlers run. */
export async function blockExternalNavigation(page: Page) {
  await page.addInitScript(() => {
    document.addEventListener(
      "click",
      (e) => {
        const a = (e.target as Element | null)?.closest?.("a");
        if (a && a.href && new URL(a.href).origin !== location.origin) e.preventDefault();
      },
      true,
    );
  });
}

/** Scroll the whole page top→bottom in viewport-sized steps so observers and scroll handlers fire. */
export async function scrollThroughPage(page: Page) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= total; y += 300) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}
