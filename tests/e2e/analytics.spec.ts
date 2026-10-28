import { randomUUID } from "node:crypto";
import { UMAMI_WEBSITE_ID } from "./constants";
import {
  acceptConsent,
  blockExternalNavigation,
  eventNames,
  expect,
  lpEvents,
  scrollThroughPage,
  selectTicker,
  test,
  textOf,
  waitForEvent,
  type LpEvent,
  type Page,
} from "./fixtures";

const UTM_QS = "utm_source=meta&utm_medium=paid_social&utm_campaign=etf_lp_2026q4&utm_content=ad_a_fees&utm_term=etf";
const email = () => `e2e.analytics.${randomUUID().slice(0, 8)}@example.cz`;
const named = (events: LpEvent[], name: string) => events.filter((e) => e.name === name);

async function submitValidLead(page: Page, addr = email()) {
  await page.getByTestId("lead-form").scrollIntoViewIfNeeded();
  await page.getByTestId("lead-email").fill(addr);
  await page.getByTestId("lead-consent").check();
  await page.getByTestId("lead-submit").click();
  await expect(page.getByTestId("thank-you")).toBeVisible();
  return addr;
}

test.describe("analytics consent gating (plan §9.2–9.3)", () => {
  test("before consent nothing is recorded or loaded; after accept lp_view is flushed first", async ({ page, umamiScriptRequests }) => {
    await page.goto("/");
    await expect(page.getByTestId("consent-bar")).toBeVisible();
    // Interact before deciding: events must be queued, not sent.
    await page.getByTestId("calc-amount-chip-100000").click();
    await page.getByTestId("hero-cta").click();
    await page.waitForTimeout(1500); // let the 1000 ms calc_result timer elapse while consent is unset
    expect(((await lpEvents(page)) ?? []).length).toBe(0);
    expect(umamiScriptRequests).toHaveLength(0);
    await expect(page.locator(`script[data-website-id]`)).toHaveCount(0);

    await acceptConsent(page);
    await waitForEvent(page, "lp_view");
    const events = (await lpEvents(page)) ?? [];
    expect(events[0]?.name).toBe("lp_view");
    expect(events[0]?.props?.viewport_w).toBe(360);
    expect(events[0]?.props?.variant).toBe("a");
    // Queued pre-consent events are flushed in order after lp_view.
    expect(named(events, "calc_interact").map((e) => e.props?.control)).toContain("amount_chip");
    expect(named(events, "cta_click").map((e) => e.props?.location)).toContain("hero");
    for (const e of events) expect(typeof e.ts, e.name).toBe("number");

    expect(await page.evaluate(() => localStorage.getItem("lp_analytics_consent"))).toBe("granted");
    await expect.poll(() => umamiScriptRequests.length).toBeGreaterThanOrEqual(1);
    await expect(page.locator(`script[data-website-id="${UMAMI_WEBSITE_ID}"]`)).toHaveCount(1);
    await expect
      .poll(() => page.evaluate(() => (window.__umamiCalls ?? []).map((c) => c.name)))
      .toContain("lp_view");
  });

  test("after consent-reject nothing is recorded, even through a full flow and reload", async ({ page, umamiScriptRequests }) => {
    await page.goto(`/?${UTM_QS}`);
    await page.getByTestId("consent-reject").click();
    await expect(page.getByTestId("consent-bar")).toBeHidden();
    await page.getByTestId("hero-cta").click();
    await page.getByTestId("calc-years-chip-10").click();
    await page.waitForTimeout(1500); // calc_result debounce window
    await scrollThroughPage(page);
    await submitValidLead(page);
    expect(((await lpEvents(page)) ?? []).length).toBe(0);
    expect(await page.evaluate(() => localStorage.getItem("lp_analytics_consent"))).toBe("denied");
    expect(umamiScriptRequests).toHaveLength(0);

    await page.reload();
    await expect(page.getByTestId("consent-bar")).toBeHidden();
    await page.waitForTimeout(500);
    expect(((await lpEvents(page)) ?? []).length).toBe(0);
    expect(umamiScriptRequests).toHaveLength(0);
  });

  test("return visit with stored grant loads Umami immediately and records lp_view", async ({ page, umamiScriptRequests }) => {
    await page.goto("/");
    await acceptConsent(page);
    await waitForEvent(page, "lp_view");
    const before = umamiScriptRequests.length;
    await page.reload();
    await expect(page.getByTestId("consent-bar")).toBeHidden();
    await waitForEvent(page, "lp_view");
    await expect.poll(() => umamiScriptRequests.length).toBeGreaterThan(before);
  });

  test("consent-settings reopens the consent bar", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("consent-reject").click();
    await expect(page.getByTestId("consent-bar")).toBeHidden();
    await page.getByTestId("consent-settings").scrollIntoViewIfNeeded();
    await page.getByTestId("consent-settings").click();
    await expect(page.getByTestId("consent-bar")).toBeVisible();
    await page.getByTestId("consent-accept").click();
    await waitForEvent(page, "lp_view");
  });
});

test.describe("event contract (plan §9.4)", () => {
  test("full flow fires every §9.4 event (except form_error/source_click/value_interact) with variant + UTM props", async ({ page, leadRequests }) => {
    await page.goto(`/?${UTM_QS}`);
    await acceptConsent(page);
    await waitForEvent(page, "lp_view");

    // CTA: hero
    await page.getByTestId("hero-cta").click();
    // Calculator: each control once, two valid results.
    await page.getByTestId("calc-amount-input").fill("100000");
    await page.getByTestId("calc-years-chip-10").click();
    await selectTicker(page.getByTestId("calc-etf-b"), "VOO");
    await waitForEvent(page, "calc_result", (p) => p.amount_czk === 100000 && p.years === 10 && p.etf_a === "SPY" && p.etf_b === "VOO" && p.fee_diff_czk === 641);
    await selectTicker(page.getByTestId("calc-etf-a"), "IVV");
    await selectTicker(page.getByTestId("calc-etf-b"), "SPYM");
    await page.getByTestId("calc-amount-chip-1000000").click();
    await page.getByTestId("calc-years-chip-30").click();
    await waitForEvent(page, "calc_result", (p) => p.amount_czk === 1000000 && p.years === 30 && p.etf_a === "IVV" && p.etf_b === "SPYM" && p.fee_diff_czk === 2978);

    // CTA: calc_unlock, priips, sticky
    await page.getByTestId("calc-unlock-cta").click();
    await expect(page.getByTestId("lead-form")).toBeInViewport();
    const priipsCta = page.getByTestId("priips-note").getByText("Odemknout evropské protějšky", { exact: true });
    await priipsCta.scrollIntoViewIfNeeded();
    await priipsCta.click();
    await page.getByTestId("faq").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("sticky-cta")).toBeVisible();
    await page.getByTestId("sticky-cta").click();
    await expect(page.getByTestId("lead-form")).toBeInViewport();

    // Scroll depth + section views
    await page.evaluate(() => window.scrollTo(0, 0));
    await scrollThroughPage(page);
    for (const d of [25, 50, 75, 100]) await waitForEvent(page, "scroll_depth", (p) => p.depth === d);
    for (const s of ["calc", "priips", "form", "etf_table", "faq"]) await waitForEvent(page, "section_view", (p) => p.section === s);

    // Form
    await page.getByTestId("lead-form").scrollIntoViewIfNeeded();
    const addr = email();
    await page.getByTestId("lead-email").focus();
    await page.getByTestId("lead-email").fill(addr);
    await page.getByTestId("lead-consent").check();
    await page.getByTestId("lead-submit").click();
    await expect(page.getByTestId("thank-you")).toBeVisible();
    await waitForEvent(page, "lead_success");
    expect(leadRequests).toHaveLength(1);

    const events = (await lpEvents(page)) ?? [];
    const names = new Set(events.map((e) => e.name));
    for (const n of ["lp_view", "scroll_depth", "section_view", "calc_interact", "calc_result", "cta_click", "form_start", "form_submit", "lead_success"]) {
      expect(names, n).toContain(n);
    }
    // Once-only events.
    expect(named(events, "lp_view")).toHaveLength(1);
    expect(named(events, "form_start")).toHaveLength(1);
    expect(named(events, "lead_success")).toHaveLength(1);
    for (const d of [25, 50, 75, 100]) expect(named(events, "scroll_depth").filter((e) => e.props?.depth === d), `depth ${d}`).toHaveLength(1);
    for (const s of ["calc", "priips", "form", "etf_table", "faq"]) {
      expect(named(events, "section_view").filter((e) => e.props?.section === s), `section ${s}`).toHaveLength(1);
    }
    expect(named(events, "calc_interact").map((e) => e.props?.control).sort()).toEqual(["amount_chip", "amount_input", "etf_a", "etf_b", "years"]);
    expect(named(events, "calc_result").length).toBeLessThanOrEqual(10);
    expect(new Set(named(events, "cta_click").map((e) => e.props?.location))).toEqual(new Set(["hero", "calc_unlock", "priips", "sticky"]));
    // Order: form_start < form_submit < lead_success.
    const idx = (n: string) => events.findIndex((e) => e.name === n);
    expect(idx("form_start")).toBeLessThan(idx("form_submit"));
    expect(idx("form_submit")).toBeLessThan(idx("lead_success"));
    // Event names within Umami's 50-char limit.
    for (const n of names) expect(n.length).toBeLessThanOrEqual(50);

    // Common props on every event; never the email.
    for (const e of events) {
      expect(e.props, e.name).toMatchObject({
        variant: "a",
        utm_source: "meta",
        utm_medium: "paid_social",
        utm_campaign: "etf_lp_2026q4",
        utm_content: "ad_a_fees",
        utm_term: "etf",
      });
    }
    const serialized = JSON.stringify(events).toLowerCase();
    expect(serialized).not.toContain(addr.toLowerCase());
    expect(serialized).not.toContain(addr.split("@")[0].toLowerCase());

    // The same events reach Umami's track().
    const umamiNames = await page.evaluate(() => (window.__umamiCalls ?? []).map((c) => c.name));
    for (const n of names) expect(umamiNames, n).toContain(n);
  });

  test("variant /b tags events with variant b and no empty UTM props", async ({ page }) => {
    await page.goto("/b");
    await acceptConsent(page);
    await waitForEvent(page, "lp_view");
    const events = (await lpEvents(page)) ?? [];
    for (const e of events) {
      expect(e.props?.variant, e.name).toBe("b");
      for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
        expect(e.props ?? {}, `${e.name}.${k}`).not.toHaveProperty(k);
      }
    }
  });

  test("form_error fires on every failed attempt with the right reason", async ({ page }) => {
    await page.goto("/");
    await acceptConsent(page);
    await page.getByTestId("lead-form").scrollIntoViewIfNeeded();
    const reasons = async () => named((await lpEvents(page)) ?? [], "form_error").map((e) => e.props?.reason);

    await page.getByTestId("lead-email").fill(email());
    await page.getByTestId("lead-submit").click();
    await page.getByTestId("lead-submit").click();
    await expect.poll(reasons).toEqual(["consent_missing", "consent_missing"]);

    await page.getByTestId("lead-email").fill("jana@");
    await page.getByTestId("lead-consent").check();
    await page.getByTestId("lead-submit").click();
    await expect.poll(reasons).toEqual(["consent_missing", "consent_missing", "invalid_email"]);
    expect(await eventNames(page)).not.toContain("form_submit");

    const mocked: [number, string, string][] = [
      [429, '{"ok":false,"error":"rate_limited"}', "rate_limited"],
      [500, '{"ok":false,"error":"server_error"}', "server_error"],
      [422, '{"ok":false,"error":"validation_failed","fields":{"variant":"invalid_variant"}}', "validation_failed"],
    ];
    await page.getByTestId("lead-email").fill(email());
    const expected = ["consent_missing", "consent_missing", "invalid_email"];
    for (const [status, body, reason] of mocked) {
      await page.route("**/api/leads", (r) => r.fulfill({ status, contentType: "application/json", body }));
      await page.getByTestId("lead-submit").click();
      expected.push(reason);
      await expect.poll(reasons).toEqual(expected);
      await page.unroute("**/api/leads");
    }
    await page.route("**/api/leads", (r) => r.abort("failed"));
    await page.getByTestId("lead-submit").click();
    expected.push("network");
    await expect.poll(reasons).toEqual(expected);
    // Server-side failures happen after form_submit.
    expect(named((await lpEvents(page)) ?? [], "form_submit")).toHaveLength(4);
    expect(await eventNames(page)).not.toContain("lead_success");
  });

  test("source_click fires on every ETF-table source link click with the ticker", async ({ page }) => {
    await blockExternalNavigation(page);
    await page.goto("/");
    await acceptConsent(page);
    const link = page.getByTestId("etf-row-SPY").filter({ visible: true }).first().getByText("web emitenta");
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await link.click();
    await expect
      .poll(async () => named((await lpEvents(page)) ?? [], "source_click").map((e) => e.props?.ticker))
      .toEqual(["SPY", "SPY"]);
  });

  test("value_interact: copy ISIN (clipboard + toast) and open UCITS source", async ({ page, context, baseURL }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });
    await blockExternalNavigation(page);
    await page.goto("/");
    await acceptConsent(page);
    await submitValidLead(page);
    const isin = "IE000XZSV718";
    await page.getByTestId(`copy-isin-${isin}`).click();
    await expect(page.getByText("Zkopírováno").first()).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(isin);
    await waitForEvent(page, "value_interact", (p) => p.action === "copy_isin" && p.isin === isin);

    const card = page.getByTestId(`ucits-row-${isin}`);
    await card.locator('a[href^="https://"]').first().click();
    await waitForEvent(page, "value_interact", (p) => p.action === "open_source" && p.isin === isin);
    await page.getByTestId(`copy-isin-${isin}`).click();
    await expect
      .poll(async () => named((await lpEvents(page)) ?? [], "value_interact").filter((e) => e.props?.action === "copy_isin").length)
      .toBe(2);
  });

  test("reload after unlock shows thank-you without refiring lead_success", async ({ page }) => {
    await page.goto("/");
    await acceptConsent(page);
    await submitValidLead(page);
    await waitForEvent(page, "lead_success");
    await page.reload();
    await expect(page.getByTestId("thank-you")).toBeVisible();
    await waitForEvent(page, "lp_view");
    await page.waitForTimeout(500);
    expect(await eventNames(page)).not.toContain("lead_success");
  });
});

test.describe("sticky CTA (plan §3)", () => {
  test("hidden in hero, visible after hero, hidden over form and after unlock", async ({ page }) => {
    await page.goto("/");
    const sticky = page.getByTestId("sticky-cta");
    // Hidden while the consent bar is shown, even after scrolling past the hero.
    await page.getByTestId("priips-note").scrollIntoViewIfNeeded();
    await expect(sticky).toBeHidden();
    await page.getByTestId("consent-reject").click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(sticky).toBeHidden();
    await page.getByTestId("faq").scrollIntoViewIfNeeded();
    await expect(sticky).toBeVisible();
    expect(await textOf(sticky)).not.toBe("");
    await page.getByTestId("lead-form").scrollIntoViewIfNeeded();
    await expect(sticky).toBeHidden();
    await submitValidLead(page);
    await page.getByTestId("faq").scrollIntoViewIfNeeded();
    await expect(sticky).toBeHidden();
  });
});
