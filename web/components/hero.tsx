import type { Variant } from "@/lib/analytics";
import { formatDate } from "@/lib/format";
import { ScrollLink } from "@/components/scroll-cta";
import { SECTION_IDS } from "@/lib/sections";

/** Hero copy continues the ad promise word for word (docs/ads.md). */
export function Hero({
  variant,
  ratioText,
  retrievedAt,
}: {
  variant: Variant;
  ratioText: string;
  retrievedAt: string;
}) {
  return (
    <section id={SECTION_IDS.hero} data-testid="hero" className="hero px-5 pt-6 pb-9">
      <div className="mx-auto max-w-xl">
        <p className="eyebrow">
          ETF z newyorské burzy NYSE Arca · data od emitentů, stažena {formatDate(retrievedAt)}
        </p>
        {variant === "a" ? (
          <>
            <h1 className="hero-title">
              Stejný index <span className="whitespace-nowrap">S&amp;P 500</span>. Poplatek až{" "}
              <span className="hero-mark">{ratioText}×</span> vyšší.
            </h1>
            <p className="hero-sub">
              Zadejte částku a za 30 vteřin uvidíte, kolik vás roční poplatek (TER) stojí u SPY,
              IVV, VOO a SPYM.
            </p>
          </>
        ) : (
          <>
            <h1 className="hero-title">
              Proč u brokera nenajdete <span className="hero-search">VOO</span> – a co sleduje
              stejný index
            </h1>
            <p className="hero-sub">
              Americká ETF nemají dokument KID, který EU vyžaduje pro drobné investory. Porovnejte
              jejich poplatky a odemkněte evropské protějšky se stejným indexem.
            </p>
          </>
        )}
        <ScrollLink
          target={SECTION_IDS.calc}
          location="hero"
          testId="hero-cta"
          className="btn btn-stamp btn-arrow mt-6 w-full sm:w-auto"
        >
          {variant === "a" ? "Spočítat moje poplatky" : "Porovnat ETF"}
        </ScrollLink>
        <p className="trust-line">
          Vzdělávací srovnání, ne investiční doporučení. Zdroje a data u každého čísla.
        </p>
      </div>
    </section>
  );
}
