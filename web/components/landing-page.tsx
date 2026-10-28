import { Calculator } from "@/components/calculator";
import { EtfTable } from "@/components/etf-table";
import { Faq } from "@/components/faq";
import { Hero } from "@/components/hero";
import { LandingProvider } from "@/components/landing-provider";
import { LeadSection } from "@/components/lead-section";
import { PageAnalytics } from "@/components/page-analytics";
import { PriipsNote } from "@/components/priips-note";
import { SiteFooter } from "@/components/site-footer";
import { StickyCta } from "@/components/sticky-cta";
import type { Variant } from "@/lib/analytics";
import { formatRatio } from "@/lib/format";
import { getLandingData } from "@/lib/landing-data";

/** Both routes render this; only the hero differs by variant (§4). */
export function LandingPage({ variant }: { variant: Variant }) {
  const data = getLandingData();
  return (
    <LandingProvider
      variant={variant}
      retrievedAt={data.retrievedAt}
      etfs={data.etfs}
      ucits={data.ucits}
    >
      <PageAnalytics variant={variant} />
      <main>
        <Hero
          variant={variant}
          ratioText={formatRatio(data.sp500TerRatio)}
          retrievedAt={data.retrievedAt}
        />
        <Calculator />
        <PriipsNote />
        <LeadSection />
        <EtfTable />
        <Faq />
      </main>
      <SiteFooter />
      <StickyCta />
    </LandingProvider>
  );
}
