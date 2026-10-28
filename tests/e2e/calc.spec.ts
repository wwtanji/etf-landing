import { loadDataset } from "../support/dataset";
import { expect, norm, selectTicker, test, textOf, type Page } from "./fixtures";

const ds = loadDataset();
const terOf = (t: string) => ds.etfs.find((e) => e.ticker === t)?.ter_pct ?? NaN;

/** plan §6.2 formula and display rules, implemented independently here. */
const fee = (amount: number, ter: number, years: number) => amount * (1 - Math.pow(1 - ter / 100, years));
const kc = (n: number) => `${norm(new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(Math.round(n)))} Kč`;
const terText = (ter: number) =>
  `${norm(new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(ter))} %`;

async function expectResult(page: Page, r: { a: string; b: string; feeA: string; feeB: string; years: number; diff: string }) {
  const rowA = page.getByTestId("calc-fee-a");
  const rowB = page.getByTestId("calc-fee-b");
  await expect.poll(async () => textOf(rowA)).toContain(r.feeA);
  await expect.poll(async () => textOf(rowB)).toContain(r.feeB);
  expect(await textOf(rowA)).toContain(r.a);
  expect(await textOf(rowA)).toContain(terText(terOf(r.a)));
  expect(await textOf(rowB)).toContain(r.b);
  expect(await textOf(rowB)).toContain(terText(terOf(r.b)));
  await expect.poll(async () => textOf(page.getByTestId("calc-diff"))).toBe(`Rozdíl za ${r.years} let: ${r.diff}`);
}

test.describe("fee calculator (plan §6)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("consent-reject").click();
  });

  test("shows the default fixture on load (500 000 Kč, 20 let, SPY vs SPYM)", async ({ page }) => {
    await expect(page.getByTestId("calc-result")).toBeVisible();
    expect(norm(await page.getByTestId("calc-amount-input").inputValue())).toBe("500 000");
    await expect(page.getByTestId("calc-amount-input")).toHaveAttribute("inputmode", "numeric");
    await expectResult(page, { a: "SPY", b: "SPYM", feeA: "9 366 Kč", feeB: "1 996 Kč", years: 20, diff: "7 369 Kč" });
    expect(await textOf(page.getByTestId("calc-fee-a"))).toContain("0,0945 %");
    expect(await textOf(page.getByTestId("calc-fee-b"))).toContain("0,02 %");
  });

  test("selects list all 11 US ETFs grouped by Czech group labels", async ({ page }) => {
    for (const id of ["calc-etf-a", "calc-etf-b"]) {
      const sel = page.getByTestId(id);
      await expect(sel.locator("option")).toHaveCount(11);
      const labels = await sel.locator("optgroup").evaluateAll((els) => els.map((e) => e.getAttribute("label")));
      expect(labels).toEqual([
        "S&P 500",
        "Celý americký trh",
        "Celý svět",
        "Vyspělé trhy mimo USA",
        "Rozvíjející se trhy",
        "Americké dluhopisy",
      ]);
    }
  });

  test("changing inputs updates the result per the §6.2 fixtures", async ({ page }) => {
    await page.getByTestId("calc-amount-chip-100000").click();
    await page.getByTestId("calc-years-chip-10").click();
    await selectTicker(page.getByTestId("calc-etf-b"), "VOO");
    await expectResult(page, { a: "SPY", b: "VOO", feeA: "941 Kč", feeB: "300 Kč", years: 10, diff: "641 Kč" });

    await page.getByTestId("calc-amount-chip-1000000").click();
    await page.getByTestId("calc-years-chip-30").click();
    await selectTicker(page.getByTestId("calc-etf-a"), "IVV");
    await selectTicker(page.getByTestId("calc-etf-b"), "SPYM");
    await expectResult(page, { a: "IVV", b: "SPYM", feeA: "8 961 Kč", feeB: "5 983 Kč", years: 30, diff: "2 978 Kč" });

    await page.getByTestId("calc-amount-chip-500000").click();
    await page.getByTestId("calc-years-chip-5").click();
    const a = fee(500_000, terOf("IVV"), 5);
    const b = fee(500_000, terOf("SPYM"), 5);
    await expectResult(page, { a: "IVV", b: "SPYM", feeA: kc(a), feeB: kc(b), years: 5, diff: kc(Math.abs(a - b)) });
  });

  test("typed amount recomputes live (no submit button)", async ({ page }) => {
    const input = page.getByTestId("calc-amount-input");
    await input.fill("250000");
    const a = fee(250_000, terOf("SPY"), 20);
    const b = fee(250_000, terOf("SPYM"), 20);
    await expectResult(page, { a: "SPY", b: "SPYM", feeA: kc(a), feeB: kc(b), years: 20, diff: kc(Math.abs(a - b)) });
    await expect(page.getByTestId("calc").getByRole("button", { name: /spočítat|vypočítat/i })).toHaveCount(0);
  });

  for (const bad of ["500", "100000001", "abc"]) {
    test(`invalid amount "${bad}" shows calc-amount-error and keeps the last valid result`, async ({ page }) => {
      await page.getByTestId("calc-amount-input").fill(bad);
      await expect(page.getByTestId("calc-amount-error")).toBeVisible();
      expect(await textOf(page.getByTestId("calc-amount-error"))).toBe("Zadejte částku 1 000 – 100 000 000 Kč");
      await expectResult(page, { a: "SPY", b: "SPYM", feeA: "9 366 Kč", feeB: "1 996 Kč", years: 20, diff: "7 369 Kč" });
    });
  }

  test("amount bounds 1 000 and 100 000 000 are valid", async ({ page }) => {
    const input = page.getByTestId("calc-amount-input");
    await input.fill("1000");
    await expect(page.getByTestId("calc-amount-error")).toHaveCount(0);
    await expect.poll(async () => textOf(page.getByTestId("calc-fee-a"))).toContain(kc(fee(1000, terOf("SPY"), 20)));
    await input.fill("100000000");
    await expect(page.getByTestId("calc-amount-error")).toHaveCount(0);
    await expect.poll(async () => textOf(page.getByTestId("calc-fee-a"))).toContain(kc(fee(100_000_000, terOf("SPY"), 20)));
  });

  test("different groups show the fair-comparison hint", async ({ page }) => {
    const hint = "Férové srovnání je mezi ETF se stejným indexem.";
    await expect(page.getByText(hint)).toHaveCount(0);
    await selectTicker(page.getByTestId("calc-etf-b"), "AGG");
    await expect(page.getByTestId("calc").getByText(hint)).toBeVisible();
  });

  test("locked row: twins → lock + CTA; no twins → no-counterpart text", async ({ page }) => {
    const unlock = page.getByTestId("calc-unlock");
    expect(await textOf(unlock)).toContain("Evropská alternativa: 🔒 ISIN, TER a poplatek v Kč po odemčení");
    expect(await textOf(page.getByTestId("calc-unlock-cta"))).toBe("Odemknout zdarma");
    // Locked: no ISIN of the twins is revealed in the calculator.
    expect(await textOf(page.getByTestId("calc"))).not.toContain("IE000XZSV718");

    const twinless = ds.etfs.filter((e) => e.ucits_twin_ids.length === 0).map((e) => e.ticker);
    expect(twinless.length).toBeGreaterThanOrEqual(2);
    await selectTicker(page.getByTestId("calc-etf-a"), twinless[0]);
    await selectTicker(page.getByTestId("calc-etf-b"), twinless[1]);
    await expect.poll(async () => textOf(unlock)).toContain("Pro tento index nemáme v přehledu evropskou alternativu.");
    await expect(page.getByTestId("calc-unlock-cta")).toHaveCount(0);
  });

  test("calc-unlock-cta scrolls lead-form into view without focusing the email", async ({ page }) => {
    await page.getByTestId("calc-unlock-cta").click();
    await expect(page.getByTestId("lead-form")).toBeInViewport();
    expect(await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))).not.toBe("lead-email");
  });

  test("footnote explains TER-only cost; FAQ 4 holds the formula", async ({ page }) => {
    expect(await textOf(page.getByTestId("calc"))).toContain(
      "Počítáme jen poplatek fondu (TER): každý rok si fond strhne TER z hodnoty investice. Zhodnocení, poplatky brokera, daně ani kurzové rozdíly nepočítáme. Ilustrace nákladů, ne předpověď výnosu.",
    );
    expect(norm(await page.getByTestId("faq").textContent())).toContain(
      "Kalkulačka počítá poplatek za n let jako částka × (1 − (1 − TER)ⁿ), bez zhodnocení.",
    );
  });
});

test.describe("unlocked calculator row (plan §6.1, §6.2 UCITS fixtures)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("lp_unlocked", "1"));
    await page.goto("/");
    await page.getByTestId("consent-reject").click();
  });

  async function expectUcits(page: Page, spyl: string, cspx: string, years: number, diff: string) {
    const unlock = page.getByTestId("calc-unlock");
    await expect.poll(async () => textOf(page.getByTestId("calc-ucits-fee-IE000XZSV718"))).toBe(`SPYL · ${terText(0.03)} · ${spyl}`);
    expect(await textOf(page.getByTestId("calc-ucits-fee-IE00B5BMR087"))).toBe(`CSPX · ${terText(0.07)} · ${cspx}`);
    expect(await textOf(page.getByTestId("calc-ucits-diff"))).toBe(`Rozdíl mezi nimi za ${years} let: ${diff}`);
    expect(await textOf(unlock)).toContain("Evropské alternativy pro stejnou částku a dobu:");
    expect(await textOf(unlock)).not.toContain("podobný index");
    expect(await textOf(unlock)).not.toContain("🔒");
    await expect(page.getByTestId("calc-unlock-cta")).toHaveCount(0);
  }

  test("defaults, then the other two fixtures, recomputed live", async ({ page }) => {
    await expectUcits(page, "2 991 Kč", "6 954 Kč", 20, "3 962 Kč");

    await page.getByTestId("calc-amount-chip-100000").click();
    await page.getByTestId("calc-years-chip-10").click();
    await selectTicker(page.getByTestId("calc-etf-b"), "VOO");
    await expect.poll(async () => textOf(page.getByTestId("calc-ucits-diff"))).toBe("Rozdíl mezi nimi za 10 let: 398 Kč");
    await expectUcits(page, "300 Kč", "698 Kč", 10, "398 Kč");

    await page.getByTestId("calc-amount-chip-1000000").click();
    await page.getByTestId("calc-years-chip-30").click();
    await selectTicker(page.getByTestId("calc-etf-a"), "IVV");
    await selectTicker(page.getByTestId("calc-etf-b"), "SPYM");
    await expect.poll(async () => textOf(page.getByTestId("calc-ucits-diff"))).toBe("Rozdíl mezi nimi za 30 let: 11 827 Kč");
    await expectUcits(page, "8 961 Kč", "20 788 Kč", 30, "11 827 Kč");
  });
});
