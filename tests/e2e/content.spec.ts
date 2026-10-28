import { czDate, loadDataset } from "../support/dataset";
import { expect, test, textOf } from "./fixtures";

const ds = loadDataset();
const DISCLAIMER =
  "Tato stránka slouží pouze ke vzdělávacím účelům a nepředstavuje investiční doporučení, investiční poradenství ani nabídku investičního nástroje. Investování je spojeno s rizikem: hodnota investice může klesat i stoupat a není zaručena návratnost vložených prostředků. Minulé výsledky nejsou zárukou budoucích výnosů. Údaje o ETF pocházejí z webů emitentů k uvedeným datům a mohou být neaktuální. Americká ETF (s domicilem v USA) zpravidla nejsou drobným investorům v EU dostupná, protože k nim emitenti nevydávají sdělení klíčových informací (KID) podle nařízení PRIIPs.";

/** "Data k {as_of_date}": date format is not fixed by the contract, accept ISO or Czech. */
const dataK = (iso: string) => new RegExp(`Data k (${iso}|${czDate(iso).replace(/\./g, "\\.")})`);

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("consent-reject").click();
});

test("etf-table has one row per US ETF in dataset order", async ({ page }) => {
  const table = page.getByTestId("etf-table");
  const ids = await table.locator('[data-testid^="etf-row-"]').evaluateAll((els) =>
    els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => e.getAttribute("data-testid")),
  );
  expect(ids).toEqual(ds.etfs.map((e) => `etf-row-${e.ticker}`));
});

test("etf-row-SPY links to its source_url and shows its as-of date", async ({ page }) => {
  const spy = ds.etfs.find((e) => e.ticker === "SPY");
  if (!spy) throw new Error("SPY missing from dataset");
  const row = page.getByTestId("etf-row-SPY").filter({ visible: true }).first();
  await row.scrollIntoViewIfNeeded();
  const link = row.locator(`a[href="${spy.source_url}"]`);
  await expect(link).toHaveCount(1);
  expect(await textOf(link)).toBe("web emitenta");
  expect((await link.getAttribute("rel")) ?? "").toContain("noopener");
  const t = await textOf(row);
  expect(t).toMatch(dataK(spy.as_of_date));
  expect(t).toContain("0,0945 %");
});

test("every ETF row shows TER date or the prospectus fallback, plus as-of date", async ({ page }) => {
  for (const e of ds.etfs) {
    const t = await textOf(page.getByTestId(`etf-row-${e.ticker}`).filter({ visible: true }).first());
    expect(t, e.ticker).toMatch(dataK(e.as_of_date));
    if (e.ter_as_of) {
      expect(t, e.ticker).toMatch(new RegExp(`TER k (${e.ter_as_of}|${czDate(e.ter_as_of).replace(/\./g, "\\.")})`));
    } else {
      expect(t, e.ticker).toContain(`TER dle prospektu, staženo`);
    }
  }
});

test("table footnote cites issuers and retrieval date", async ({ page }) => {
  const t = await textOf(page.getByTestId("etf-table"));
  expect(t).toContain("Údaje z webů emitentů (State Street, iShares/BlackRock, Vanguard).");
  expect(t).toMatch(new RegExp(`Staženo (${ds.retrieved_at}|${czDate(ds.retrieved_at).replace(/\./g, "\\.")})`));
});

test("etf-sort-ter sorts rows by TER ascending", async ({ page }) => {
  await page.getByTestId("etf-sort-ter").click();
  const ids = await page
    .getByTestId("etf-table")
    .locator('[data-testid^="etf-row-"]')
    .evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => e.getAttribute("data-testid")));
  const ters = ids.map((id) => ds.etfs.find((e) => `etf-row-${e.ticker}` === id)?.ter_pct ?? NaN);
  expect(ters).toHaveLength(11);
  expect(ters).toEqual([...ters].sort((a, b) => a - b));
});

test("risk disclaimer is present verbatim and visible", async ({ page }) => {
  const d = page.getByTestId("risk-disclaimer");
  await d.scrollIntoViewIfNeeded();
  await expect(d).toBeVisible();
  expect(await textOf(d)).toContain(DISCLAIMER);
});

test("operator gap is flagged, not invented (site-config empty)", async ({ page }) => {
  await expect(page.getByText("Údaje provozovatele doplníme před spuštěním").first()).toBeAttached();
});

test("PRIIPs note and FAQ are present", async ({ page }) => {
  const p = await textOf(page.getByTestId("priips-note"));
  expect(p).toContain("Háček: v Česku je většinou nekoupíte.");
  expect(p).toContain("E-004745/2021");
  await expect(
    page.getByTestId("priips-note").locator('a[href="https://www.europarl.europa.eu/doceo/document/E-9-2021-004745_EN.pdf"]'),
  ).toHaveCount(1);
  const f = await textOf(page.getByTestId("faq"));
  for (const q of ["Je to investiční doporučení?", "Proč chcete můj e-mail?", "Odkud jsou data?", "Co je TER?"]) {
    expect(f).toContain(q);
  }
});

test("no advice wording (kupte / doporučujeme / nejlepší) on the page", async ({ page }) => {
  const body = (await textOf(page.locator("body"))).toLowerCase();
  expect(body).not.toMatch(/\bkupte\b/);
  expect(body).not.toMatch(/\bdoporučujeme\b/);
  expect(body).not.toMatch(/nejlepší/);
});

test("privacy-link goes to /soukromi and the notice renders", async ({ page }) => {
  const link = page.getByTestId("privacy-link");
  await expect(link).toHaveAttribute("href", "/soukromi");
  expect(await textOf(link)).toBe("Zásady ochrany osobních údajů");
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await expect(page).toHaveURL(/\/soukromi$/);
  const t = await textOf(page.locator("body"));
  for (const s of ["Správce", "e-mail", "čl. 6 odst. 1 písm. a) GDPR", "Upstash", "Umami", "24 měsíců", "ÚOOÚ", "lp_analytics_consent", "lp_unlocked"]) {
    expect(t, s).toContain(s);
  }
});

test("/soukromi responds 200 directly", async ({ page }) => {
  const res = await page.goto("/soukromi");
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveCount(1);
});

test("GET /api/etfs over HTTP returns the dataset", async ({ request }) => {
  const res = await request.get("/api/etfs");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual(ds);
});
