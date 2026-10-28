"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { track } from "@/lib/analytics";
import { CONSENT_VERSION } from "@/lib/server/config";
import { SECTION_IDS } from "@/lib/sections";
import { markUnlocked, useUnlocked } from "@/lib/ui-store";
import { readUtm } from "@/lib/utm";
import { twinsOf, useLanding } from "@/components/landing-provider";
import { ScrollLink, scrollToSection } from "@/components/scroll-cta";
import { SectionLabel } from "@/components/section-label";
import { UcitsCard } from "@/components/ucits-card";

type FormErrorReason =
  | "invalid_email"
  | "consent_missing"
  | "rate_limited"
  | "validation_failed"
  | "server_error"
  | "network";

const ERROR_MESSAGES: Record<FormErrorReason, string> = {
  invalid_email: "Zkontrolujte prosím e-mail.",
  consent_missing: "Pro odemčení potřebujeme váš souhlas.",
  rate_limited: "Příliš mnoho pokusů. Zkuste to prosím za pár minut.",
  validation_failed: "Něco se pokazilo. Zkuste to prosím znovu.",
  server_error: "Něco se pokazilo. Zkuste to prosím znovu.",
  network: "Něco se pokazilo. Zkuste to prosím znovu.",
};

const LEADS_ENDPOINT = "/api/leads";

type LeadResponse = { ok?: unknown; error?: unknown; fields?: Record<string, unknown> };

/** Maps a non-200 / non-ok API answer to the §5.4 error reason. */
function reasonFromResponse(status: number, body: LeadResponse | null): FormErrorReason {
  if (status === 429) return "rate_limited";
  if (status === 422 && body?.fields) {
    if (body.fields.email) return "invalid_email";
    if (body.fields.consent) return "consent_missing";
    return "validation_failed";
  }
  return "server_error";
}

export function LeadSection() {
  const unlocked = useUnlocked();
  const justUnlocked = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!unlocked || !justUnlocked.current) return;
    justUnlocked.current = false;
    headingRef.current?.focus({ preventScroll: true });
    scrollToSection(SECTION_IDS.form);
  }, [unlocked]);

  return (
    <section
      id={SECTION_IDS.form}
      data-section="form"
      className="lead-section scroll-mt-0 px-5 py-12"
    >
      <div className="mx-auto max-w-xl">
        {unlocked ? (
          <ThankYou headingRef={headingRef} />
        ) : (
          <LeadForm
            onSuccess={() => {
              justUnlocked.current = true;
              markUnlocked();
            }}
          />
        )}
      </div>
    </section>
  );
}

function LeadForm({ onSuccess }: { onSuccess: () => void }) {
  const { variant } = useLanding();
  const emailId = useId();
  const consentId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FormErrorReason | null>(null);

  function markStart() {
    if (started.current) return;
    started.current = true;
    track("form_start");
  }

  function fail(reason: FormErrorReason) {
    setError(reason);
    track("form_error", { reason });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = emailRef.current;
    const consent = consentRef.current;
    if (loading || !email || !consent) return;
    if (email.value.trim() === "" || !email.validity.valid) return fail("invalid_email");
    if (!consent.checked) return fail("consent_missing");

    setError(null);
    setLoading(true);
    track("form_submit");
    let response: Response;
    try {
      response = await fetch(LEADS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value.trim(),
          consent: true,
          consent_version: CONSENT_VERSION,
          variant,
          page_path: variant === "a" ? "/" : "/b",
          utm: readUtm(),
          website: honeypotRef.current?.value ?? "",
        }),
      });
    } catch (networkError) {
      console.warn("lead submit failed", networkError);
      setLoading(false);
      return fail("network");
    }

    let body: LeadResponse | null = null;
    try {
      body = (await response.json()) as LeadResponse;
    } catch (parseError) {
      console.warn("lead response is not JSON", parseError);
    }
    setLoading(false);
    if (response.status === 200 && body?.ok === true) {
      track("lead_success");
      onSuccess();
      return;
    }
    fail(reasonFromResponse(response.status, body));
  }

  return (
    <div data-testid="lead-form">
      <SectionLabel index="03">Evropské protějšky</SectionLabel>
      <h2 className="font-display text-[1.75rem] leading-[1.1] font-semibold tracking-tight">
        Které evropské ETF sledují stejný index?
      </h2>
      <p className="mt-3 leading-relaxed text-paper/85">
        Odemkněte přehled evropských (UCITS) protějšků: ISIN pro vyhledání u brokera, TER a zdroj.
        Ukážeme ho hned tady na stránce.
      </p>

      <form noValidate onSubmit={onSubmit} className="mt-6">
        <label htmlFor={emailId} className="field-label text-paper/80">
          Váš e-mail
        </label>
        <input
          ref={emailRef}
          id={emailId}
          data-testid="lead-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="jmeno@email.cz"
          required
          className="email-input"
          aria-invalid={error === "invalid_email"}
          onFocus={markStart}
          onInput={markStart}
        />

        <div className="hp" aria-hidden="true">
          <label>
            Web
            <input
              ref={honeypotRef}
              data-testid="lead-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              defaultValue=""
            />
          </label>
        </div>

        <div className="consent">
          <input
            ref={consentRef}
            id={consentId}
            data-testid="lead-consent"
            name="consent"
            type="checkbox"
            required
            defaultChecked={false}
            aria-invalid={error === "consent_missing"}
          />
          <label htmlFor={consentId}>
            Souhlasím se zasíláním e-mailů o poplatcích ETF a novinkách (nejvýše 1× měsíčně) a se
            zpracováním e-mailu podle{" "}
            <a href="/soukromi" className="link" target="_blank" rel="noopener">
              zásad ochrany osobních údajů
            </a>
            . Souhlas můžu kdykoli odvolat.
          </label>
        </div>

        {error && (
          <p data-testid="lead-error" role="alert" className="lead-error">
            {ERROR_MESSAGES[error]}
          </p>
        )}

        <button
          type="submit"
          data-testid="lead-submit"
          disabled={loading}
          className="btn btn-stamp mt-5 w-full"
        >
          {loading ? "Odemykám…" : "Odemknout přehled"}
        </button>
        <p className="mt-3 text-center text-sm text-paper/70">
          Žádný spam. Odhlásit se můžete kdykoli.
        </p>
      </form>
    </div>
  );
}

function ThankYou({ headingRef }: { headingRef: RefObject<HTMLHeadingElement | null> }) {
  const { etfA, etfB, etfByTicker, ucitsByIsin, ucits } = useLanding();
  const a = etfByTicker.get(etfA);
  const b = etfByTicker.get(etfB);
  if (!a || !b) throw new Error(`ThankYou: unknown ticker ${etfA}/${etfB}`);

  const tickers = etfA === etfB ? [etfA] : [etfA, etfB];
  const twins = twinsOf(tickers, etfByTicker, ucitsByIsin);
  const twinIsins = new Set(twins.map((t) => t.isin));
  const others = ucits.filter((u) => !twinIsins.has(u.isin));
  const allSame = twins.every((t) => tickers.some((ticker) => t.index_match[ticker] === "same"));

  const compared = tickers.length === 1 ? a.ticker : `${a.ticker} a ${b.ticker}`;
  const indexes = a.index === b.index ? a.index : `${a.index} a ${b.index}`;

  return (
    <div data-testid="thank-you">
      <SectionLabel index="03">Odemčeno</SectionLabel>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[1.75rem] leading-[1.1] font-semibold tracking-tight outline-none"
      >
        Hotovo. Tady jsou evropské protějšky.
      </h2>
      <p data-testid="thank-you-intro" className="mt-3 leading-relaxed text-paper/85">
        Porovnávali jste {compared} ({indexes}).{" "}
        {twins.length === 0
          ? "Pro tato ETF nemáme v přehledu evropský protějšek. Ostatní evropská ETF najdete níže."
          : allSame
            ? "Stejný index sledují tato evropská ETF:"
            : "Stejný nebo podobný index sledují tato evropská ETF:"}
      </p>

      {twins.length > 0 && (
        <ul className="mt-5 space-y-3">
          {twins.map((twin) => (
            <UcitsCard key={twin.isin} ucits={twin} tickers={tickers} />
          ))}
        </ul>
      )}

      {others.length > 0 && (
        <>
          <h3 className="mt-9 font-mono text-xs tracking-[0.14em] text-paper/70 uppercase">
            Další indexy
          </h3>
          <ul className="mt-3 space-y-3">
            {others.map((other) => (
              <UcitsCard key={other.isin} ucits={other} tickers={other.us_counterparts} />
            ))}
          </ul>
        </>
      )}

      <div className="checklist mt-9">
        <h3 className="font-display text-xl font-semibold">Než něco koupíte</h3>
        <ol>
          <li>U brokera hledejte podle ISIN. Tickery se na evropských burzách liší.</li>
          <li>Ověřte, že k ETF je k dispozici dokument KID. Bez něj vám ho broker zpravidla neprodá.</li>
          <li>Porovnejte nejen TER, ale i poplatky brokera a za převod měny.</li>
          <li>Akumulační ETF dividendy reinvestuje, distribuční je vyplácí.</li>
        </ol>
      </div>

      <p className="mt-7 leading-relaxed text-paper/85">
        Až se poplatky těchto ETF změní, dáme vám vědět e-mailem.
      </p>
      <ScrollLink
        target={SECTION_IDS.table}
        testId="thank-you-next"
        className="btn btn-paper btn-arrow mt-4 w-full sm:w-auto"
      >
        Projít celé srovnání amerických ETF
      </ScrollLink>
    </div>
  );
}
