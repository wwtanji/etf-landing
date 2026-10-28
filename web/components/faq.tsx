import { SectionLabel } from "@/components/section-label";
import { SECTION_IDS } from "@/lib/sections";

const FAQ_ITEMS = [
  {
    q: "Je to investiční doporučení?",
    a: "Ne. Stránka je vzdělávací srovnání veřejně dostupných údajů. Neříká, co si máte koupit, a nezohledňuje vaši situaci.",
  },
  {
    q: "Proč chcete můj e-mail?",
    a: "Výměnou za přehled evropských alternativ vám budeme posílat novinky o poplatcích ETF, nejvýše 1× měsíčně. Souhlas můžete kdykoli odvolat.",
  },
  {
    q: "Odkud jsou data?",
    a: "Přímo z webů emitentů. U každého čísla je odkaz na zdroj a datum, ke kterému údaj platí.",
  },
  {
    q: "Co je TER?",
    a: "Celková nákladovost fondu za rok v procentech z investované částky. Strhává se průběžně z hodnoty fondu. Kalkulačka počítá poplatek za n let jako částka × (1 − (1 − TER)ⁿ), bez zhodnocení.",
  },
] as const;

export function Faq() {
  return (
    <section
      id={SECTION_IDS.faq}
      data-testid="faq"
      data-section="faq"
      className="scroll-mt-4 px-5 pb-12"
    >
      <div className="mx-auto max-w-xl">
        <SectionLabel index="05">Otázky</SectionLabel>
        <h2 className="font-display text-[1.75rem] leading-[1.1] font-semibold tracking-tight">
          Na co se lidé ptají
        </h2>
        <div className="mt-5 border-t border-ink">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
