import type { Metadata } from "next";
import Link from "next/link";
import { OperatorLine } from "@/components/operator-line";
import { SiteFooter } from "@/components/site-footer";
import { CONSENT_STORAGE_KEY, UNLOCKED_STORAGE_KEY } from "@/lib/storage-keys";
import { CONSENT_VERSION } from "@/lib/server/config";
import { OPERATOR_MISSING_TEXT, siteConfig } from "@/lib/site-config";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Zásady ochrany osobních údajů",
  robots: { index: false },
};

export default function PrivacyPage() {
  return (
    <>
      <main className="px-5 pt-8 pb-12">
        <article className="prose-page mx-auto max-w-xl">
          <Link href="/" className="link font-mono text-xs tracking-[0.12em] uppercase">
            ← Zpět na srovnání
          </Link>
          <h1 className="mt-6 font-display text-[2rem] leading-[1.1] font-semibold tracking-tight">
            Zásady ochrany osobních údajů
          </h1>

          <h2>1. Správce</h2>
          <OperatorLine />

          <h2>2. Jaké údaje zpracováváme</h2>
          <ul>
            <li>e-mail, který zadáte ve formuláři,</li>
            <li>čas udělení souhlasu a verzi jeho textu (aktuálně {CONSENT_VERSION}),</li>
            <li>variantu stránky, ze které jste formulář odeslali,</li>
            <li>UTM parametry z odkazu, přes který jste přišli (např. zdroj a kampaň).</li>
          </ul>
          <p>IP adresu ani údaje o prohlížeči k e-mailu neukládáme.</p>

          <h2>3. Účel a právní základ</h2>
          <p>
            E-mail používáme k zasílání novinek o poplatcích ETF (nejvýše 1× měsíčně) na základě
            vašeho souhlasu podle čl. 6 odst. 1 písm. a) GDPR. Měření návštěvnosti spouštíme jen s
            vaším souhlasem.
          </p>

          <h2>4. Zpracovatelé</h2>
          <ul>
            <li>Vercel: hosting stránky,</li>
            <li>Upstash: databáze, region EU (Frankfurt),</li>
            <li>Umami Cloud: statistiky návštěvnosti bez cookies, jen po vašem souhlasu.</li>
          </ul>

          <h2>5. Doba uložení</h2>
          <p>Do odvolání souhlasu, nejdéle 24 měsíců od posledního e-mailu, který vám pošleme.</p>

          <h2>6. Vaše práva</h2>
          <p>
            Máte právo na přístup k údajům, jejich opravu a výmaz, právo souhlas kdykoli odvolat,
            právo na přenositelnost údajů a právo podat stížnost u Úřadu pro ochranu osobních údajů
            (
            <a href="https://uoou.gov.cz" target="_blank" rel="noopener" className="link">
              uoou.gov.cz
            </a>
            ).
          </p>

          <h2>7. Kontakt</h2>
          <p>
            {siteConfig.contactEmail ? (
              <a href={`mailto:${siteConfig.contactEmail}`} className="link">
                {siteConfig.contactEmail}
              </a>
            ) : (
              OPERATOR_MISSING_TEXT
            )}
          </p>

          <h2>8. Lokální úložiště</h2>
          <p>Stránka ukládá ve vašem prohlížeči dvě technicky nezbytné hodnoty:</p>
          <ul>
            <li>
              <code>{CONSENT_STORAGE_KEY}</code>: vaše volba k měření návštěvnosti,
            </li>
            <li>
              <code>{UNLOCKED_STORAGE_KEY}</code>: že jste přehled evropských protějšků už odemkli.
            </li>
          </ul>
          <p>Cookies stránka nepoužívá.</p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
