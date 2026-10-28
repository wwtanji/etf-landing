import { czDate, heroRatioText, loadDataset } from "../support/dataset";
import { expect, norm, test, textOf } from "./fixtures";

const ds = loadDataset();
const ratio = heroRatioText(ds); // computed per plan §5.1, today "4,7"
const eyebrow = `ETF z newyorské burzy NYSE Arca · data od emitentů, stažena ${czDate(ds.retrieved_at)}`;
const trust = "Vzdělávací srovnání, ne investiční doporučení. Zdroje a data u každého čísla.";

const VARIANTS = [
  {
    path: "/",
    h1: `Stejný index S&P 500. Poplatek až ${ratio}× vyšší.`,
    sub: "Zadejte částku a za 30 vteřin uvidíte, kolik vás roční poplatek (TER) stojí u SPY, IVV, VOO a SPYM.",
    cta: "Spočítat moje poplatky",
  },
  {
    path: "/b",
    h1: "Proč u brokera nenajdete VOO – a co sleduje stejný index",
    sub: "Americká ETF nemají dokument KID, který EU vyžaduje pro drobné investory. Porovnejte jejich poplatky a odemkněte evropské protějšky se stejným indexem.",
    cta: "Porovnat ETF",
  },
] as const;

for (const v of VARIANTS) {
  test.describe(`hero ${v.path}`, () => {
    test("copy matches docs/ads.md", async ({ page }) => {
      await page.goto(v.path);
      const hero = page.getByTestId("hero");
      await expect(hero).toBeVisible();
      expect(await textOf(hero.locator("h1"))).toBe(v.h1);
      const heroText = await textOf(hero);
      expect(heroText).toContain(eyebrow);
      expect(heroText).toContain(v.sub);
      expect(heroText).toContain(trust);
      expect(await textOf(page.getByTestId("hero-cta"))).toBe(v.cta);
      // Exactly one H1 on the page.
      await expect(page.locator("h1")).toHaveCount(1);
    });

    test("eyebrow, H1, sub, CTA and trust line are above the fold at 360×740", async ({ page }) => {
      await page.goto(v.path);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      const hero = page.getByTestId("hero");
      await expect(page.getByTestId("hero-cta")).toBeInViewport({ ratio: 1 });
      await expect(hero.locator("h1")).toBeInViewport({ ratio: 1 });
      for (const text of [eyebrow, v.sub, trust]) {
        const loc = hero.getByText(text.slice(0, 40), { exact: false }).first();
        await expect(loc, text).toBeInViewport({ ratio: 1 });
      }
    });

    test("consent bar (≤ 88 px) does not cover the hero CTA", async ({ page }) => {
      await page.goto(v.path);
      const bar = page.getByTestId("consent-bar");
      await expect(bar).toBeVisible();
      const b = await bar.boundingBox();
      const c = await page.getByTestId("hero-cta").boundingBox();
      expect(b && c).toBeTruthy();
      if (!b || !c) return;
      expect(b.height).toBeLessThanOrEqual(88);
      const overlap = !(c.y + c.height <= b.y || b.y + b.height <= c.y || c.x + c.width <= b.x || b.x + b.width <= c.x);
      expect(overlap, "consent bar overlaps hero-cta").toBe(false);
      // Non-modal: the CTA is still clickable and scrolls to the calculator (§5.1).
      await page.getByTestId("hero-cta").click();
      await expect(page.getByTestId("calc")).toBeInViewport();
    });
  });
}

test("hero CTA scrolls to the calculator without focusing the email field", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("hero-cta").click();
  await expect(page.getByTestId("calc")).toBeInViewport();
  expect(await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))).not.toBe("lead-email");
});

test("section order matches plan §5", async ({ page }) => {
  await page.goto("/");
  const ids = ["hero", "calc", "priips-note", "lead-form", "etf-table", "faq", "risk-disclaimer"];
  const tops: number[] = [];
  for (const id of ids) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box, id).not.toBeNull();
    tops.push(box?.y ?? -1);
  }
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
  expect(norm(await page.locator("html").getAttribute("lang"))).toBe("cs");
});
