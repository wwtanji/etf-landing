import { describe, expect, it } from "vitest";
import { totalFeeCzk } from "@/lib/fees";

// plan §6.2 fixtures (computed from data/etfs.json).
const FIXTURES = [
  { amount: 500_000, years: 20, terA: 0.0945, terB: 0.02, feeA: 9365.6417, feeB: 1996.2046, shownA: "9 366 Kč", shownB: "1 996 Kč", diff: "7 369 Kč" },
  { amount: 100_000, years: 10, terA: 0.0945, terB: 0.03, feeA: 940.9915, feeB: 299.5953, shownA: "941 Kč", shownB: "300 Kč", diff: "641 Kč" },
  { amount: 1_000_000, years: 30, terA: 0.03, terB: 0.02, feeA: 8960.9594, feeB: 5982.6324, shownA: "8 961 Kč", shownB: "5 983 Kč", diff: "2 978 Kč" },
] as const;

const kc = (n: number) =>
  `${new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(Math.round(n))} Kč`.replace(/\s/g, " ");

describe("totalFeeCzk (plan §6.2)", () => {
  for (const f of FIXTURES) {
    it(`${f.amount} Kč / ${f.years} let: ${f.terA} % vs ${f.terB} %`, () => {
      const a = totalFeeCzk(f.amount, f.terA, f.years);
      const b = totalFeeCzk(f.amount, f.terB, f.years);
      expect(Math.abs(a - f.feeA)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(b - f.feeB)).toBeLessThanOrEqual(0.01);
      // Display rules from §6.2 applied to the module's unrounded output.
      expect(kc(a)).toBe(f.shownA);
      expect(kc(b)).toBe(f.shownB);
      expect(kc(Math.abs(a - b))).toBe(f.diff);
    });
  }

  it("is zero for zero years and proportional to the amount", () => {
    expect(totalFeeCzk(500_000, 0.0945, 0)).toBe(0);
    expect(totalFeeCzk(1_000_000, 0.03, 10)).toBeCloseTo(2 * totalFeeCzk(500_000, 0.03, 10), 9);
  });

  it("returns unrounded values", () => {
    expect(Number.isInteger(totalFeeCzk(500_000, 0.0945, 20))).toBe(false);
  });
});
