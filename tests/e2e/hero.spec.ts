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
    h1: "Proč u brokera nenajdete VOO – a která ETF sledují stejný index",
    sub: "Americká ETF zpravidla nemají dokument KID, který EU vyžaduje pro drobné investory. Porovnejte jejich poplatky a odemkněte evropské alternativy se stejným indexem.",
    cta: "Ukázat evropská ETF",
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
      // Non-modal: the CTA is still clickable and scrolls to its target (§5.1).
      await page.getByTestId("hero-cta").click();
      await expect(page.getByTestId(v.path === "/" ? "calc" : "priips-note")).toBeInViewport();
    });
  });
}

test("hero CTA on / scrolls so calc-diff is fully visible and not under sticky-cta", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("consent-reject").click();
  await expect(page.getByTestId("consent-bar")).toBeHidden();
  await page.getByTestId("hero-cta").click();
  const diff = page.getByTestId("calc-diff");
  await expect(diff).toBeInViewport({ ratio: 1 });
  // Let smooth scrolling settle, then check the sticky CTA does not cover it.
  await page.waitForTimeout(800);
  await expect(diff).toBeInViewport({ ratio: 1 });
  const sticky = page.getByTestId("sticky-cta");
  if (await sticky.isVisible()) {
    const s = await sticky.boundingBox();
    const d = await diff.boundingBox();
    expect(s && d).toBeTruthy();
    if (s && d) expect(d.y + d.height <= s.y || s.y + s.height <= d.y, "sticky-cta overlaps calc-diff").toBe(true);
  }
  expect(await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))).not.toBe("lead-email");
});

test("hero CTA on /b scrolls to priips-note, not the calculator", async ({ page }) => {
  await page.goto("/b");
  await page.getByTestId("consent-reject").click();
  await page.getByTestId("hero-cta").click();
  await expect(page.getByTestId("priips-note")).toBeInViewport();
  await page.waitForTimeout(800);
  const top = await page.getByTestId("priips-note").evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(top), "priips-note top near viewport top").toBeLessThan(200);
  await expect(page.getByTestId("calc-diff")).not.toBeInViewport();
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
