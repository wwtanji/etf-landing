import { ScrollLink } from "@/components/scroll-cta";
import { SectionLabel } from "@/components/section-label";
import { SECTION_IDS } from "@/lib/sections";

/** EP written question E-004745/2021 (docs/ads.md, retrieved 2026-10-28). */
const PRIIPS_SOURCE_URL = "https://www.europarl.europa.eu/doceo/document/E-9-2021-004745_EN.pdf";

export function PriipsNote() {
  return (
    <section
      id={SECTION_IDS.priips}
      data-testid="priips-note"
      data-section="priips"
      className="scroll-mt-4 px-5 pb-12"
    >
      <div className="priips mx-auto max-w-xl">
        <SectionLabel index="02">Dostupnost</SectionLabel>
        <h2 className="font-display text-[1.6rem] leading-[1.15] font-semibold tracking-tight">
          Háček: v Česku je většinou nekoupíte.
        </h2>
        <div className="mt-4 space-y-3 text-[0.98rem] leading-relaxed">
          <p>
            Od roku 2018 musí mít investiční produkty pro drobné investory v EU sdělení klíčových
            informací (KID) podle nařízení PRIIPs. Americká ETF ho zpravidla nemají, a proto vám je
            evropský broker obvykle neprodá.
          </p>
          <p>
            Existují ale evropská (UCITS) ETF, která sledují stejný nebo podobný index. Přehled s
            ISIN a poplatky odemknete níže.
          </p>
        </div>
        <p className="mt-4 text-[0.8125rem] text-ink-soft italic">
          Zdroj:{" "}
          <a href={PRIIPS_SOURCE_URL} target="_blank" rel="noopener" className="link">
            písemný dotaz v Evropském parlamentu E-004745/2021
          </a>
        </p>
        <ScrollLink
          target={SECTION_IDS.form}
          location="priips"
          testId="priips-cta"
          className="btn btn-ink btn-arrow mt-5 w-full sm:w-auto"
        >
          Odemknout evropské protějšky
        </ScrollLink>
      </div>
    </section>
  );
}
