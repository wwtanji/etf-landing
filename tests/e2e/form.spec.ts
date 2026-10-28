import { randomUUID } from "node:crypto";
import { loadDataset } from "../support/dataset";
import { expect, norm, test, textOf, type Page } from "./fixtures";

const ds = loadDataset();
const email = () => `e2e.${randomUUID().slice(0, 8)}@example.cz`;
const CONSENT_VERSION = "cz-2026-10-28-v1";

async function openForm(page: Page, path = "/") {
  await page.goto(path);
  await page.getByTestId("consent-reject").click();
  await page.getByTestId("lead-form").scrollIntoViewIfNeeded();
}

test.describe("lead form (plan §5.4)", () => {
  test("fields, consent default and honeypot follow the contract", async ({ page }) => {
    await openForm(page);
    const form = page.getByTestId("lead-form");
    expect(await textOf(form)).toContain("Které evropské ETF sledují stejný index?");
    const input = page.getByTestId("lead-email");
    await expect(input).toHaveAttribute("type", "email");
    await expect(input).toHaveAttribute("autocomplete", "email");
    await expect(input).toHaveAttribute("inputmode", "email");
    await expect(input).toHaveAttribute("placeholder", "jmeno@email.cz");
    await expect(page.getByLabel("Váš e-mail")).toHaveCount(1);

    const consent = page.getByTestId("lead-consent");
    await expect(consent).not.toBeChecked();
    const consentText = await textOf(form);
    expect(consentText).toContain(
      "Souhlasím se zasíláním e-mailů o poplatcích ETF a novinkách (nejvýše 1× měsíčně) a se zpracováním e-mailu podle zásad ochrany osobních údajů. Souhlas můžu kdykoli odvolat.",
    );
    await expect(form.locator('a[href="/soukromi"]')).toHaveCount(1);

    const hp = page.getByTestId("lead-website");
    await expect(hp).toHaveAttribute("name", "website");
    await expect(hp).toHaveAttribute("tabindex", "-1");
    await expect(hp).toHaveAttribute("autocomplete", "off");
    await expect(hp).toHaveAttribute("aria-hidden", "true");
    const hpBox = await hp.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { display: getComputedStyle(el).display, right: r.right, left: r.left, docBottom: r.bottom + window.scrollY };
    });
    expect(hpBox.display).not.toBe("none");
    const offScreen = hpBox.right <= 0 || hpBox.left >= 360 || hpBox.docBottom <= 0;
    expect(offScreen, `honeypot should be off-screen: ${JSON.stringify(hpBox)}`).toBe(true);

    expect(await textOf(page.getByTestId("lead-submit"))).toBe("Odemknout přehled");
    expect(await textOf(form)).toContain("Žádný spam. Odhlásit se můžete kdykoli.");
  });

  test("submit without consent shows lead-error and makes no request", async ({ page, leadRequests }) => {
    await openForm(page);
    await page.getByTestId("lead-email").fill(email());
    await page.getByTestId("lead-submit").click();
    const err = page.getByTestId("lead-error");
    await expect(err).toBeVisible();
    await expect(err).toHaveAttribute("role", "alert");
    expect(await textOf(err)).toBe("Pro odemčení potřebujeme váš souhlas.");
    await page.waitForLoadState("networkidle");
    expect(leadRequests).toHaveLength(0);
    await expect(page.getByTestId("thank-you")).toHaveCount(0);
  });

  for (const bad of ["", "jana.novakova@", "jana novakova"]) {
    test(`invalid email "${bad}" shows lead-error and makes no request`, async ({ page, leadRequests }) => {
      await openForm(page);
      await page.getByTestId("lead-email").fill(bad);
      await page.getByTestId("lead-consent").check();
      await page.getByTestId("lead-submit").click();
      await expect(page.getByTestId("lead-error")).toBeVisible();
      expect(await textOf(page.getByTestId("lead-error"))).toBe("Zkontrolujte prosím e-mail.");
      await page.waitForLoadState("networkidle");
      expect(leadRequests).toHaveLength(0);
    });
  }

  test("valid submit shows thank-you with the selected ETFs' UCITS twins", async ({ page, leadRequests }) => {
    await page.goto("/?utm_source=meta&utm_medium=paid_social&utm_campaign=etf_lp_2026q4&utm_content=ad_a_fees");
    await page.getByTestId("consent-reject").click();
    await page.getByTestId("lead-form").scrollIntoViewIfNeeded();
    const addr = email();
    await page.getByTestId("lead-email").fill(addr);
    await page.getByTestId("lead-consent").check();
    const resp = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/leads");
    await page.getByTestId("lead-submit").click();
    const res = await resp;
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    // Request body per §8.2.
    expect(leadRequests).toHaveLength(1);
    const body = leadRequests[0].postDataJSON() as Record<string, unknown>;
    expect(body).toMatchObject({
      email: addr,
      consent: true,
      consent_version: CONSENT_VERSION,
      variant: "a",
      page_path: "/",
      utm: { source: "meta", medium: "paid_social", campaign: "etf_lp_2026q4", content: "ad_a_fees" },
    });
    expect(body.website ?? "").toBe("");
    expect(leadRequests[0].headers()["content-type"]).toContain("application/json");

    const ty = page.getByTestId("thank-you");
    await expect(ty).toBeVisible();
    await expect(page.getByTestId("lead-form")).toHaveCount(0);
    expect(await textOf(ty)).toContain("Hotovo. Tady jsou evropské protějšky.");
    // Focus moves to the thank-you heading (§13).
    await expect
      .poll(() => page.evaluate(() => (document.activeElement?.textContent ?? "").replace(/\s+/g, " ")), { message: "focus on heading" })
      .toContain("Hotovo. Tady jsou evropské protějšky.");
    expect(await textOf(ty)).toContain("Porovnávali jste SPY a SPYM");
    await expect(ty).toBeInViewport();

    // Twins of SPY/SPYM first, TER ascending (SPYL 0.03 before CSPX 0.07), then the rest.
    const rowIds = await ty.locator('[data-testid^="ucits-row-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
    const twinIsins = [...new Set(["SPY", "SPYM"].flatMap((t) => ds.etfs.find((e) => e.ticker === t)?.ucits_twin_ids ?? []))];
    const twinsSorted = twinIsins
      .map((i) => ds.ucits.find((u) => u.isin === i))
      .sort((a, b) => (a?.ter_pct ?? 0) - (b?.ter_pct ?? 0))
      .map((u) => `ucits-row-${u?.isin}`);
    expect(rowIds.slice(0, twinsSorted.length)).toEqual(twinsSorted);
    expect([...rowIds].sort()).toEqual(ds.ucits.map((u) => `ucits-row-${u.isin}`).sort());
    expect(await textOf(ty)).toContain("Další indexy");

    for (const u of ds.ucits) {
      const card = page.getByTestId(`ucits-row-${u.isin}`);
      const t = await textOf(card);
      expect(t).toContain(u.isin);
      expect(t).toContain(u.ticker);
      expect(t).toContain("Irsko · akumulační");
      expect(t).toMatch(/Data k /);
      await expect(page.getByTestId(`copy-isin-${u.isin}`)).toBeVisible();
      await expect(card.locator(`a[href="${u.source_url}"]`)).toHaveCount(1);
    }
    expect(await textOf(ty)).toContain("Než něco koupíte");
    expect(await textOf(ty)).toContain("U brokera hledejte podle ISIN.");

    // Calculator's locked row turns into the unlocked list.
    const unlock = page.getByTestId("calc-unlock");
    await expect.poll(async () => textOf(unlock)).toContain("SPYL");
    expect(await textOf(unlock)).toContain("CSPX");
    await expect(page.getByTestId("calc-unlock-cta")).toHaveCount(0);

    expect(await page.evaluate(() => localStorage.getItem("lp_unlocked"))).toBe("1");
    await page.reload();
    await expect(page.getByTestId("thank-you")).toBeVisible();
    await expect(page.getByTestId("lead-form")).toHaveCount(0);
  });

  test("variant /b submits variant b and page_path /b", async ({ page, leadRequests }) => {
    await openForm(page, "/b");
    await page.getByTestId("lead-email").fill(email());
    await page.getByTestId("lead-consent").check();
    await page.getByTestId("lead-submit").click();
    await expect(page.getByTestId("thank-you")).toBeVisible();
    expect(leadRequests[0]?.postDataJSON()).toMatchObject({ variant: "b", page_path: "/b", consent: true });
  });

  test("duplicate email still unlocks (same 200 response)", async ({ page, browser }) => {
    const addr = email();
    await openForm(page);
    await page.getByTestId("lead-email").fill(addr);
    await page.getByTestId("lead-consent").check();
    await page.getByTestId("lead-submit").click();
    await expect(page.getByTestId("thank-you")).toBeVisible();

    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, extraHTTPHeaders: { "x-forwarded-for": "10.99.0.1" } });
    const p2 = await ctx.newPage();
    await p2.goto(new URL("/", page.url()).toString());
    await p2.getByTestId("consent-reject").click();
    await p2.getByTestId("lead-email").fill(addr);
    await p2.getByTestId("lead-consent").check();
    await p2.getByTestId("lead-submit").click();
    await expect(p2.getByTestId("thank-you")).toBeVisible();
    await ctx.close();
  });

  test("loading state: button disabled and reads Odemykám…", async ({ page }) => {
    await openForm(page);
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    await page.route("**/api/leads", async (route) => {
      await gate;
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    await page.getByTestId("lead-email").fill(email());
    await page.getByTestId("lead-consent").check();
    await page.getByTestId("lead-submit").click();
    await expect(page.getByTestId("lead-submit")).toBeDisabled();
    expect(norm(await page.getByTestId("lead-submit").innerText())).toBe("Odemykám…");
    release();
    await expect(page.getByTestId("thank-you")).toBeVisible();
  });

  const API_ERRORS = [
    { name: "429 rate_limited", status: 429, body: { ok: false, error: "rate_limited" }, msg: "Příliš mnoho pokusů. Zkuste to prosím za pár minut." },
    { name: "500 server_error", status: 500, body: { ok: false, error: "server_error" }, msg: "Něco se pokazilo. Zkuste to prosím znovu." },
    {
      name: "422 other field",
      status: 422,
      body: { ok: false, error: "validation_failed", fields: { variant: "invalid_variant" } },
      msg: "Něco se pokazilo. Zkuste to prosím znovu.",
    },
    {
      name: "422 invalid_email",
      status: 422,
      body: { ok: false, error: "validation_failed", fields: { email: "invalid_email" } },
      msg: "Zkontrolujte prosím e-mail.",
    },
  ] as const;

  for (const e of API_ERRORS) {
    test(`API ${e.name} → lead-error "${e.msg}", form stays`, async ({ page }) => {
      await openForm(page);
      await page.route("**/api/leads", (route) =>
        route.fulfill({ status: e.status, contentType: "application/json", body: JSON.stringify(e.body) }),
      );
      await page.getByTestId("lead-email").fill(email());
      await page.getByTestId("lead-consent").check();
      await page.getByTestId("lead-submit").click();
      await expect(page.getByTestId("lead-error")).toBeVisible();
      expect(await textOf(page.getByTestId("lead-error"))).toBe(e.msg);
      await expect(page.getByTestId("thank-you")).toHaveCount(0);
      await expect(page.getByTestId("lead-submit")).toBeEnabled();
    });
  }

  test('network failure → "Něco se pokazilo. Zkuste to prosím znovu."', async ({ page }) => {
    await openForm(page);
    await page.route("**/api/leads", (route) => route.abort("failed"));
    await page.getByTestId("lead-email").fill(email());
    await page.getByTestId("lead-consent").check();
    await page.getByTestId("lead-submit").click();
    await expect(page.getByTestId("lead-error")).toBeVisible();
    expect(await textOf(page.getByTestId("lead-error"))).toBe("Něco se pokazilo. Zkuste to prosím znovu.");
  });
});
