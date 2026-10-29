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
          <Link href="/" className="link text-sm">
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
          <p>
            IP adresu ani údaje o prohlížeči k e-mailu neukládáme. IP adresu používáme jen krátce
            jako klíč pro omezení počtu odeslání formuláře (nejvýše 5 pokusů za 10 minut). Tento
            záznam se sám smaže zhruba po 20 minutách.
          </p>

          <h2>3. Účel a právní základ</h2>
          <p>
            E-mail používáme k zasílání novinek o poplatcích ETF (nejvýše 1× měsíčně) na základě
            vašeho souhlasu podle čl. 6 odst. 1 písm. a) GDPR. Měření návštěvnosti spouštíme jen s
            vaším souhlasem. Omezení počtu odeslání formuláře podle IP adresy chrání stránku před
            zneužitím. Právním základem je náš oprávněný zájem podle čl. 6 odst. 1 písm. f) GDPR.
          </p>

          <h2>4. Zpracovatelé</h2>
          <ul>
            <li>
              Vercel Inc. (USA): hosting stránky, serverové funkce běží v regionu EU (Frankfurt),
            </li>
            <li>Upstash, Inc. (USA): databáze, region EU (Frankfurt),</li>
            <li>
              Umami Software, Inc. (USA), služba Umami Cloud: statistiky návštěvnosti bez cookies,
              jen po vašem souhlasu, datový region EU.
            </li>
          </ul>

          <h2>5. Předávání mimo EU</h2>
          <p>
            Data ukládáme v EU. Všichni tři zpracovatelé jsou ale americké společnosti a k údajům se
            mohou dostat i z USA, například při podpoře nebo zabezpečení služby. Vercel je
            certifikován podle rámce EU-U.S. Data Privacy Framework, ke kterému Evropská komise
            vydala rozhodnutí o odpovídající ochraně. Upstash podle své smlouvy o zpracování používá
            tentýž rámec, a kde by nestačil, standardní smluvní doložky schválené Evropskou komisí.
            Umami používá standardní smluvní doložky.
          </p>

          <h2>6. Doba uložení</h2>
          <p>
            E-mail a záznam o souhlasu uchováváme do odvolání souhlasu, nejdéle 24 měsíců od udělení
            souhlasu nebo od posledního e-mailu, který vám pošleme, podle toho, co nastane později.
            Statistiky návštěvnosti v Umami se mažou po 6 měsících.
          </p>

          <h2>7. Vaše práva</h2>
          <p>
            Máte právo na přístup k údajům, jejich opravu a výmaz, právo na omezení zpracování,
            právo na přenositelnost údajů a právo vznést námitku proti zpracování. Proti zasílání
            obchodních sdělení můžete vznést námitku kdykoli a bez udání důvodu. Souhlas můžete
            kdykoli odvolat. Odvolání nemá vliv na zpracování před ním. Máte také právo podat
            stížnost u Úřadu pro ochranu osobních údajů (
            <a href="https://uoou.gov.cz" target="_blank" rel="noopener" className="link">
              uoou.gov.cz
            </a>
            ). Stačí napsat na kontaktní e-mail níže.
          </p>

          <h2>8. Kontakt</h2>
          <p>
            {siteConfig.contactEmail ? (
              <a href={`mailto:${siteConfig.contactEmail}`} className="link">
                {siteConfig.contactEmail}
              </a>
            ) : (
              OPERATOR_MISSING_TEXT
            )}
          </p>

          <h2>9. Lokální úložiště</h2>
          <p>Stránka ukládá ve vašem prohlížeči dvě technicky nezbytné hodnoty:</p>
          <ul>
            <li>
              <code>{CONSENT_STORAGE_KEY}</code>: vaše volba k měření návštěvnosti,
            </li>
            <li>
              <code>{UNLOCKED_STORAGE_KEY}</code>: že jste přehled evropských alternativ už odemkli.
            </li>
          </ul>
          <p>Cookies stránka nepoužívá.</p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
