import Link from "next/link";
import { ConsentSettingsButton } from "@/components/consent-bar";
import { OperatorLine } from "@/components/operator-line";

export function SiteFooter() {
  return (
    <footer className="site-footer px-5 pt-10 pb-28">
      <div className="mx-auto max-w-xl space-y-6">
        <div data-testid="risk-disclaimer" className="risk">
          <p className="text-sm font-semibold">Upozornění na rizika</p>
          <p className="mt-2">
            Tato stránka slouží pouze ke vzdělávacím účelům a nepředstavuje investiční doporučení,
            investiční poradenství ani nabídku investičního nástroje. Investování je spojeno s
            rizikem: hodnota investice může klesat i stoupat a není zaručena návratnost vložených
            prostředků. Minulé výsledky nejsou zárukou budoucích výnosů. Údaje o ETF pocházejí z
            webů emitentů k uvedeným datům a mohou být neaktuální. Americká ETF (s domicilem v USA)
            zpravidla nejsou drobným investorům v EU dostupná, protože k nim emitenti nevydávají
            sdělení klíčových informací (KID) podle nařízení PRIIPs.
          </p>
        </div>

        <div className="text-sm">
          <p className="text-sm font-semibold">Provozovatel</p>
          <OperatorLine className="mt-2" />
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm" aria-label="Patička">
          <Link href="/soukromi" data-testid="privacy-link" className="link">
            Zásady ochrany osobních údajů
          </Link>
          <ConsentSettingsButton className="link" />
        </nav>
      </div>
    </footer>
  );
}
