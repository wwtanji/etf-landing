# Architecture plan: Task B (ETF lead-magnet landing page)

Status: stage 1 output (architect), 2026-10-28, amended after critic round 1 (see "Changelog r1" at the end). Deadline: 2026-10-30.
**This file is the only source of truth for the api, web and tests agents.** If something here is wrong or missing, record the question in `docs/decisions.md` and pick the smallest reasonable option. Do not message other agents, and do not edit files outside your own directory.

Companion files:
- `docs/ads.md`: the two ad variants and the hero copy for each.
- `docs/decisions.md`: every judgment call, one line each.
- `data/etfs.json`: real ETF data. The architect has already produced it (see §7).

Launch question we optimise for: **could we run ads on this page tomorrow?**

---

## 1. Audience
- **Who:** Czech retail investors aged 25–45. They have heard of ETFs and the S&P 500, mostly from YouTube, Reddit or US finfluencers. Many have tried, or plan to try, to buy US tickers like VOO or SPY at a European broker.
- **Context:** They arrive from a Meta mobile ad (feed or Stories) on a phone, with one hand and a few seconds of attention. Traffic is cold: they do not know the brand.
- **What they want:** "Am I overpaying?" (variant A) or "Why can't I buy VOO, and what do I buy instead?" (variant B).
- **What stops them:** distrust of finance lead-gen, fear of spam or sales calls, jargon, and long forms.
- **Implications:** Show the value in the first screen. Show sources and dates on every number. Ask for one field only. Never claim to give advice. Copy is plain Czech without hype.

## 2. Offer
- **Free, ungated value:**
  1. A fee calculator. It shows how much the annual fee (TER) costs in Kč for the visitor's amount and horizon, comparing NYSE-listed ETFs that track the same index.
  2. The full comparison table of 11 NYSE Arca ETFs, with source and as-of date on every number.
  3. An honest explanation of why Czech retail investors generally cannot buy these US ETFs (PRIIPs/KID).
- **Gated value, unlocked by email and delivered immediately on the page:** "Evropské alternativy". This is the list of European UCITS ETFs that track the same or a similar index. Each row has ISIN (for searching at a broker), TER, fund size, a source link and an as-of date. Above the list, a personalised line ties it to the ETFs the visitor compared in the calculator and states what those European ETFs cost in Kč for the visitor's amount and horizon. After unlock, the calculator also compares these European ETFs (§6.1), so the fee "aha" is about funds the visitor can actually buy.
- **Why the email is worth it:** It solves the visitor's real next problem. They now know what costs what, but they cannot buy the US fund. The list turns "I can't buy VOO" into "I can search for ISIN IE000XZSV718 at my broker". In exchange, the visitor agrees to receive ETF fee updates (at most monthly).

## 3. Ask moment
- **There is no ask above the fold, no modal and no exit popup.**
- **First ask:** a locked row inside the calculator result card: "Evropská alternativa: 🔒 ISIN, TER a poplatek v Kč po odemčení". The calculator renders a default result on load (500 000 Kč, 20 let, SPY vs SPYM), so the value is visible before the visitor touches anything. The ask appears right after that value.
- **The form itself** sits after the calculator and the "Háček: PRIIPs" block (§5). By then the visitor has seen (a) their fee difference and (b) why the gated list matters.
- **Sticky CTA** (bottom bar). It appears only after the hero has scrolled out of view. It hides while the form is in view, while `calc-unlock-cta` is in the viewport, after unlock, and while the analytics consent bar is shown. It scrolls to the form.
- Clicking any CTA except `hero-cta` scrolls to the form (`hero-cta` targets: §5.1). No CTA auto-focuses the email field, because the mobile keyboard would cover the consent text.

## 4. Ad variants and routing
Full copy and visual briefs: `docs/ads.md`.

| Ad | Angle | Promise | Route | `variant` |
|---|---|---|---|---|
| A, "Fees" | same index, up to 4,7× higher fee | "Spočítejte si, kolik vás stojí poplatek" | `/` | `a` |
| B, "Access" | why you can't buy VOO at an EU broker | "Proč nenajdete VOO + evropská ETF se stejným indexem" | `/b` | `b` |

- The route decides the hero variant. UTMs only label traffic, so the page renders correctly even if UTMs are stripped.
- Both routes are statically generated. They differ only in the hero: its copy and where `hero-cta` scrolls to (§5.1). Every other section, and the section order, is identical.
- Direct or organic visits to `/` get variant A.

## 5. Section order (mobile-first, 360 px wide)
The order is the same for both variants. Each section has a `data-testid`, which is part of the contract for the tests agent.

| # | Section | `data-testid` | Why here |
|---|---|---|---|
| 1 | Hero | `hero` | Continues the ad promise word for word, so the visitor knows in about 2 s they are in the right place. One CTA. |
| 2 | Fee calculator (default result visible) | `calc` | The value comes first. The visitor sees a Kč number before anything is asked. This is the "aha" that earns the ask. |
| 3 | "Háček": PRIIPs/KID explainer | `priips-note` | Honesty that also creates the need: you can't buy these, but equivalents exist. It turns curiosity into a reason to unlock. |
| 4 | Lead form ("Evropské alternativy") | `lead-form` | The ask comes at peak intent, right after value and need. Thank-you state replaces it in place. |
| 5 | Full NYSE ETF comparison table | `etf-table` | Proof and depth for skeptics, with sources and dates. It comes after the ask so it does not push the ask down. It is still free. |
| 6 | FAQ (4 items) | `faq` | Handles objections: "is this advice?", "why my email?", "where is the data from?", "what is TER?". |
| 7 | Footer: risk disclaimer, operator, privacy, analytics settings | `risk-disclaimer` (disclaimer block), `privacy-link` | Required compliance content in a predictable place. |
| - | Sticky CTA | `sticky-cta` | Brings back visitors who scroll past the form (rules in §3). |
| - | Analytics consent bar | `consent-bar` | Must not block the content. Rules in §9.3. |

**Above-the-fold requirement at 360×740:** the eyebrow, H1, sub, primary CTA and trust line are all visible without scrolling. The top edge of the calculator should peek in.

### 5.1 Hero (`hero`, CTA `hero-cta`)
The copy is in `docs/ads.md`. Variant A H1: "Stejný index S&P 500. Poplatek až {ratio}× vyšší."
- `{ratio}` = max TER ÷ min TER within `group === "sp500"` in `data/etfs.json`. Floor it to 1 decimal and format with `cs-CZ` (today "4,7"). It is computed, never hardcoded.
- The eyebrow uses `retrieved_at` from the dataset: "data od emitentů, stažena 28. 10. 2026".
- Clicking `hero-cta` fires `cta_click` (`location: "hero"`) on both routes and scrolls:
  - **Variant A (`/`)** to the calculator. Acceptance at 360×740 with the consent bar closed: after the scroll, `calc-diff` is fully inside the viewport and not covered by `sticky-cta` (critic r1 m2). The scroll target or offset, or a more compact control layout, is web's choice.
  - **Variant B (`/b`)** to `priips-note`, which leads into the form (critic r1 M4). The label is "Ukázat evropská ETF" (`docs/ads.md`).

### 5.2 Calculator: see §6.

### 5.3 PRIIPs explainer (`priips-note`), Czech draft
> **Háček: v Česku je většinou nekoupíte.**
> Od roku 2018 musí mít investiční produkty pro drobné investory v EU sdělení klíčových informací (KID) podle nařízení PRIIPs. Americká ETF ho zpravidla nemají, a proto vám je evropský broker obvykle neprodá.
> Existují ale evropská (UCITS) ETF, která sledují stejný nebo podobný index. Přehled s ISIN a poplatky odemknete níže.
> *Zdroj: písemný dotaz v Evropském parlamentu E-004745/2021* (link to the PDF in `docs/ads.md`).

CTA inside the block: "Odemknout evropské alternativy". `cta_click` location is `priips`.

### 5.4 Lead form (`lead-form`), Czech draft
- Heading: **Které evropské ETF sledují stejný index?**
- Text: Odemkněte přehled evropských (UCITS) alternativ: ISIN pro vyhledání u brokera, TER a zdroj. Ukážeme ho hned tady na stránce.
- Email field `lead-email`: label "Váš e-mail", `type="email"`, `autocomplete="email"`, `inputmode="email"`, placeholder "jmeno@email.cz".
- Consent checkbox `lead-consent`, **unchecked by default**, required. Label (consent version `cz-2026-10-28-v2`; r1 changed "můžu" to "mohu"):
  "Souhlasím se zasíláním e-mailů o poplatcích ETF a novinkách (nejvýše 1× měsíčně) a se zpracováním e-mailu podle [zásad ochrany osobních údajů](/soukromi). Souhlas mohu kdykoli odvolat."
- Honeypot `lead-website`: input `name="website"`. It is visually hidden off-screen (not `display:none`), with `tabindex="-1"`, `autocomplete="off"` and `aria-hidden="true"`.
- Submit `lead-submit`: "Odemknout přehled". While loading it is disabled and reads "Odemykám…".
- Microcopy under the button: "Žádný spam. Odhlásit se můžete kdykoli."
- Error area `lead-error` (`role="alert"`). The message depends on the error code:
  - `invalid_email`: "Zkontrolujte prosím e-mail."
  - `consent_missing` / `consent_required`: "Pro odemčení potřebujeme váš souhlas."
  - `rate_limited`: "Příliš mnoho pokusů. Zkuste to prosím za pár minut."
  - `validation_failed` (other fields), `server_error`, `network`: "Něco se pokazilo. Zkuste to prosím znovu."
- Client-side checks before the request: the email is non-empty and `input.validity.valid`, and consent is checked. Do not ship Zod to the client.

### 5.5 ETF table (`etf-table`)
- On mobile it is a card list; at ≥768 px it may be a table. There is one row/card per US ETF: `etf-row-{TICKER}`.
- Fields shown: ticker, name, index, TER with its date note (§7.2), fund size with its scope label and "Data k {as_of_date}", and a source link to `source_url` with text "web emitenta" and `rel="noopener"`.
- When `evidence_urls` is non-empty (the Vanguard rows), a second link `etf-evidence-{TICKER}` with text "zdrojová data (JSON)" goes to `evidence_urls[0]` (`rel="noopener"`), because the Vanguard profile page HTML does not contain the figures (critic r1 m6). Both links fire `source_click` (§9.4).
- Fund size: `aum_usd` ÷ 10⁹, formatted `Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 })`, followed by " mld. USD". Examples: "814,8 mld. USD", "185 mld. USD", VOO "1 000 mld. USD". Never "bil." (critic r1 m1).
- Scope labels: `fund` "celý fond", `etf_share_class` "jen ETF třída akcií", `share_class` "jen tato třída akcií". The same size and scope rules apply to the thank-you cards.
- Default order is the dataset order, grouped by `group` with Czech group labels:
  - `sp500`: "S&P 500"
  - `us_total`: "Celý americký trh"
  - `world`: "Celý svět"
  - `developed_ex_us`: "Vyspělé trhy mimo USA"
  - `emerging`: "Rozvíjející se trhy"
  - `us_bonds`: "Americké dluhopisy"
- One toggle `etf-sort-ter` switches the sort to TER ascending.
- Under the table: "Údaje z webů emitentů (State Street, iShares/BlackRock, Vanguard). Staženo {retrieved_at}. U Vanguardu uvádíme velikost jen za ETF třídu akcií, bez tříd fondu, které se neobchodují na burze."

### 5.6 FAQ (`faq`), Czech drafts
1. **Je to investiční doporučení?** Ne. Stránka je vzdělávací srovnání veřejně dostupných údajů. Neříká, co si máte koupit, a nezohledňuje vaši situaci.
2. **Proč chcete můj e-mail?** Výměnou za přehled evropských alternativ vám budeme posílat novinky o poplatcích ETF, nejvýše 1× měsíčně. Souhlas můžete kdykoli odvolat.
3. **Odkud jsou data?** Přímo z webů emitentů. U každého čísla je odkaz na zdroj a datum, ke kterému údaj platí.
4. **Co je TER?** Celková nákladovost fondu za rok v procentech z investované částky. Strhává se průběžně z hodnoty fondu. Kalkulačka počítá poplatek za n let jako částka × (1 − (1 − TER)ⁿ), bez zhodnocení.

### 5.7 Footer
- Risk disclaimer `risk-disclaimer` (Czech, verbatim draft):
  > Tato stránka slouží pouze ke vzdělávacím účelům a nepředstavuje investiční doporučení, investiční poradenství ani nabídku investičního nástroje. Investování je spojeno s rizikem: hodnota investice může klesat i stoupat a není zaručena návratnost vložených prostředků. Minulé výsledky nejsou zárukou budoucích výnosů. Údaje o ETF pocházejí z webů emitentů k uvedeným datům a mohou být neaktuální. Americká ETF (s domicilem v USA) zpravidla nejsou drobným investorům v EU dostupná, protože k nim emitenti nevydávají sdělení klíčových informací (KID) podle nařízení PRIIPs.
- Operator line: name, IČO, address and contact email come from `web/lib/site-config.ts`. **The values are not known yet. This blocks launch (§15, Q1).**
  - The web agent creates the constant with the exact field names `operatorName`, `operatorId`, `operatorAddress` and `contactEmail`, and fills them only with values supplied by the user. It never invents them.
  - `next.config.ts` throws during `next build` **only when `VERCEL_ENV === "production"`** and any of these values is empty, so production cannot ship without them.
  - Locally and on previews, empty values render as the visible text "Údaje provozovatele doplníme před spuštěním". This is a flagged gap, not a fake value.
- Links: "Zásady ochrany osobních údajů" goes to `/soukromi` (`privacy-link`). "Nastavení měření" reopens the consent bar (`consent-settings`).

### 5.8 Privacy notice: route `/soukromi` (web agent, Czech)
Section headings and body text are **verbatim** (r1, critic M5). `{…}` are values from code. The text is drafted from the vendors' own documents and still needs the operator's confirmation and legal sign-off (§15 Q10).
1. **Správce**: operator line from site-config.
2. **Jaké údaje zpracováváme**: the existing list (e-mail; čas udělení souhlasu a verze jeho textu, aktuálně {CONSENT_VERSION}; varianta stránky; UTM parametry), then:
   "IP adresu ani údaje o prohlížeči k e-mailu neukládáme. IP adresu používáme jen krátce jako klíč pro omezení počtu odeslání formuláře (nejvýše 5 pokusů za 10 minut). Tento záznam se sám smaže zhruba po 20 minutách."
   (Source of "20 minutes": `@upstash/ratelimit` sliding window sets `PEXPIRE` to `window * 2 + 1000` ms, i.e. 1 201 s for the 600 s window, `web/node_modules/@upstash/ratelimit/dist/index.js`.)
3. **Účel a právní základ**: "E-mail používáme k zasílání novinek o poplatcích ETF (nejvýše 1× měsíčně) na základě vašeho souhlasu podle čl. 6 odst. 1 písm. a) GDPR. Měření návštěvnosti spouštíme jen s vaším souhlasem. Omezení počtu odeslání formuláře podle IP adresy chrání stránku před zneužitím. Právním základem je náš oprávněný zájem podle čl. 6 odst. 1 písm. f) GDPR."
4. **Zpracovatelé**:
   - "Vercel Inc. (USA): hosting stránky, serverové funkce běží v regionu EU (Frankfurt),"
   - "Upstash, Inc. (USA): databáze, region EU (Frankfurt),"
   - "Umami Software, Inc. (USA), služba Umami Cloud: statistiky návštěvnosti bez cookies, jen po vašem souhlasu, datový region EU."
5. **Předávání mimo EU** (new): "Data ukládáme v EU. Všichni tři zpracovatelé jsou ale americké společnosti a k údajům se mohou dostat i z USA, například při podpoře nebo zabezpečení služby. Vercel je certifikován podle rámce EU-U.S. Data Privacy Framework, ke kterému Evropská komise vydala rozhodnutí o odpovídající ochraně. Upstash podle své smlouvy o zpracování používá tentýž rámec, a kde by nestačil, standardní smluvní doložky schválené Evropskou komisí. Umami používá standardní smluvní doložky."
   Sources (retrieved 2026-10-28): Vercel "Vercel is certified under the EU-U.S. Data Privacy Framework." (https://vercel.com/docs/security/compliance); Upstash DPA (April 2025) "Upstash Inc. will use the Data Privacy Framework to lawfully receive European Data in the United States" and "If … the Data Privacy Framework does not cover the transfer … the Standard Contractual Clauses will be incorporated" (https://upstash.com/static/trust/dpa.pdf); Umami DPA §10.2 "the EU SCCs are incorporated into this DPA", Umami Software, Inc., San Francisco (https://umami.is/dpa); Umami Cloud "offers US and EU data regions, selected during account setup … It does not mean that all processing takes place within that region" (https://docs.umami.is/docs/cloud/faq).
6. **Doba uložení**: "E-mail a záznam o souhlasu uchováváme do odvolání souhlasu, nejdéle 24 měsíců od udělení souhlasu nebo od posledního e-mailu, který vám pošleme, podle toho, co nastane později. Statistiky návštěvnosti v Umami se mažou po 6 měsících." (Storage enforces 24 months from consent with a key TTL, §8.4. Umami Hobby: "6 month data retention", §9.1.)
7. **Vaše práva**: "Máte právo na přístup k údajům, jejich opravu a výmaz, právo na omezení zpracování, právo na přenositelnost údajů a právo vznést námitku proti zpracování. Proti zasílání obchodních sdělení můžete vznést námitku kdykoli a bez udání důvodu. Souhlas můžete kdykoli odvolat. Odvolání nemá vliv na zpracování před ním. Máte také právo podat stížnost u Úřadu pro ochranu osobních údajů (uoou.gov.cz). Stačí napsat na kontaktní e-mail níže."
8. **Kontakt**: contact email from site-config.
9. **Lokální úložiště**: `lp_analytics_consent` ("vaše volba k měření návštěvnosti") and `lp_unlocked` ("že jste přehled evropských alternativ už odemkli"), both strictly necessary, then "Cookies stránka nepoužívá."

## 6. Interactive element: fee calculator (`calc`)
### 6.1 UI
- **Amount** `calc-amount-input`: numeric text input, `inputmode="numeric"`, displayed with `cs-CZ` grouping. Valid range 1 000 – 100 000 000 Kč, default **500 000**. Chips `calc-amount-chip-100000`, `calc-amount-chip-500000` and `calc-amount-chip-1000000` set the value.
- **Horizon:** chips `calc-years-chip-5`, `-10`, `-20` and `-30`, default **20**.
- **ETF A** `calc-etf-a` and **ETF B** `calc-etf-b`: native `<select>`s with all 11 US ETFs in `<optgroup>`s by group label. Defaults are **SPY** (A) and **SPYM** (B). If the two are in different groups, show the hint: "Férové srovnání je mezi ETF se stejným indexem."
- **Result card** `calc-result`. It recomputes live on every change, with no submit button:
  - Row A `calc-fee-a`: ticker · TER · "{fee} Kč"
  - Row B `calc-fee-b`: the same for B
  - `calc-diff`: "Rozdíl za {years} let: {diff} Kč". The diff is the absolute value of the difference.
  - Row `calc-unlock`. "Twins" = the union of `ucits_twin_ids` of A and B, deduplicated, ordered by TER ascending, then dataset order.
    - **Locked, with twins:** "Evropská alternativa: 🔒 ISIN, TER a poplatek v Kč po odemčení" and the button `calc-unlock-cta` "Odemknout zdarma", which scrolls to the form. No ISIN of a twin appears anywhere in `calc`.
    - **No twins (locked or unlocked):** "Pro tento index nemáme v přehledu evropskou alternativu." No button.
    - **Unlocked, with twins (critic r1 M3):** the title "Evropské alternativy pro stejnou částku a dobu:", then one row per twin `calc-ucits-fee-{ISIN}`: "{ticker} · {TER} · {fee} Kč", with " · podobný index" appended when none of A/B has `index_match` `same` for that twin. With 2 or more twins, `calc-ucits-diff`: "Rozdíl mezi nimi za {years} let: {diff} Kč". Fee = `totalFeeCzk(amount, twin.ter_pct, years)` with the calculator's current values, recomputed live; diff = max − min of the unrounded twin fees, rounded. ISINs stay in the thank-you cards, not in `calc`. No extra analytics event.
- An invalid amount shows an inline error `calc-amount-error` ("Zadejte částku 1 000 – 100 000 000 Kč") and keeps the last valid result.
- Footnote (Czech): "Počítáme jen poplatek fondu (TER): každý rok si fond strhne TER z hodnoty investice. Zhodnocení, poplatky brokera, daně ani kurzové rozdíly nepočítáme. Ilustrace nákladů, ne předpověď výnosu." The formula itself is in FAQ 4 (critic r1 m1).

### 6.2 Formula (web-owned pure module `web/lib/fees.ts`)
```ts
/** Total fund cost in CZK over `years`, assuming 0 % gross return; fee charged on the declining balance. Unrounded. */
export function totalFeeCzk(amountCzk: number, terPct: number, years: number): number {
  return amountCzk * (1 - Math.pow(1 - terPct / 100, years));
}
```
- Display: `Math.round()` to whole Kč, formatted `Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 })` followed by " Kč".
- Diff: `Math.round(Math.abs(feeA − feeB))`, computed from the **unrounded** fees.
- TER display: `Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 4 })` followed by " %". So 0.0945 shows as "0,0945 %" and 0.02 as "0,02 %".
- Note: `cs-CZ` uses U+00A0 (no-break space) as the thousands separator. Tests must normalise whitespace before comparing.
- **Fixtures (computed from the current `data/etfs.json`):**

| amount | years | A | B | fee A (unrounded) | fee B (unrounded) | shown A | shown B | shown diff |
|---|---|---|---|---|---|---|---|---|
| 500 000 | 20 | SPY 0.0945 | SPYM 0.02 | 9365.6417 | 1996.2046 | 9 366 Kč | 1 996 Kč | 7 369 Kč |
| 100 000 | 10 | SPY 0.0945 | VOO 0.03 | 940.9915 | 299.5953 | 941 Kč | 300 Kč | 641 Kč |
| 1 000 000 | 30 | IVV 0.03 | SPYM 0.02 | 8960.9594 | 5982.6324 | 8 961 Kč | 5 983 Kč | 2 978 Kč |

**Unlocked UCITS fixtures** (§6.1 unlocked row and §13 `thank-you-fees`; computed from the current `data/etfs.json`, SPYL 0.03, CSPX 0.07):

| amount | years | A / B | twins | fee SPYL (unrounded) | fee CSPX (unrounded) | shown SPYL | shown CSPX | shown diff |
|---|---|---|---|---|---|---|---|---|
| 500 000 | 20 | SPY / SPYM | SPYL, CSPX | 2991.4654 | 6953.6449 | 2 991 Kč | 6 954 Kč | 3 962 Kč |
| 100 000 | 10 | SPY / VOO | SPYL, CSPX | 299.5953 | 697.7991 | 300 Kč | 698 Kč | 398 Kč |
| 1 000 000 | 30 | IVV / SPYM | SPYL, CSPX | 8960.9594 | 20788.2360 | 8 961 Kč | 20 788 Kč | 11 827 Kč |

The TER inputs and their sources: §7.3.

## 7. Data contract: `data/etfs.json`
### 7.1 Ownership and production
- **The architect produced `data/etfs.json` in stage 1** and committed it with this plan, because the figures had to be researched and verified to write the ads and plan anyway. No build agent edits it.
- To refresh it, the architect re-runs the research. A refresh script is not in scope (logged).
- The web and api agents read it. The tests agent validates it.
- Every figure was read from the issuer's own product page on 2026-10-28. robots.txt allows those paths on www.ishares.com, www.ssga.com, investor.vanguard.com and www.vanguard.co.uk. Every row stores verbatim quotes.

### 7.2 Schema (the tests agent writes its own Zod schema from this text)
```jsonc
{
  "schema_version": 1,                // literal 1
  "retrieved_at": "2026-10-28",       // YYYY-MM-DD
  "retrieved_by": "string",
  "quote_convention": "string",
  "notes": ["string"],
  "etfs": [ {                          // US-domiciled, NYSE-listed; 11 rows; unique ticker
    "ticker": "SPY",                   // ^[A-Z]{1,5}$
    "name": "string",
    "issuer": "string",
    "exchange": "NYSE Arca",           // enum: "NYSE" | "NYSE Arca"  (Nasdaq/Cboe listings are excluded)
    "domicile": "US",                  // literal
    "index": "string",
    "group": "sp500",                  // enum: sp500 | us_total | world | developed_ex_us | emerging | us_bonds
    "currency": "USD",                 // ISO 4217, 3 uppercase letters
    "ter_pct": 0.0945,                 // number, 0 < x < 2, percent (0.0945 means 0.0945 %)
    "ter_as_of": "2026-10-28",         // YYYY-MM-DD or null (source shows no date)
    "aum_usd": 814816360000,           // integer > 0 or null (unverifiable)
    "aum_scope": "fund",               // enum: fund | etf_share_class | share_class
    "aum_as_of": "2026-10-27",         // YYYY-MM-DD or null (null iff aum_usd null)
    "as_of_date": "2026-10-27",        // YYYY-MM-DD, required; = aum_as_of if present, else ter_as_of; rows with neither are excluded
    "retrieved_at": "2026-10-28",      // YYYY-MM-DD
    "source_url": "https://…",         // https URL of the human-readable issuer page
    "evidence_urls": ["https://…"],    // machine-readable endpoints actually parsed (Vanguard), else []
    "quotes": { "ter": "…", "aum": "…", "exchange": "…", "index": "…" },  // non-empty strings; all four required; extra non-empty string keys allowed and preserved
    "ucits_twin_ids": ["IE000XZSV718"] // ISINs that must exist in ucits[]
  } ],
  "ucits": [ {                         // European counterparts; 5 rows; unique isin
    "isin": "IE000XZSV718",            // ^[A-Z]{2}[A-Z0-9]{9}[0-9]$
    "ticker": "SPYL",
    "name": "string",
    "issuer": "string",
    "domicile": "IE",
    "index": "string",
    "distribution": "accumulating",    // enum: accumulating | distributing
    "currency": "USD",
    "ter_pct": 0.03, "ter_as_of": "2026-10-28" /* or null */,
    "aum_usd": 19701240000, "aum_scope": "share_class", "aum_as_of": "2026-10-27",
    "as_of_date": "2026-10-27", "retrieved_at": "2026-10-28",
    "source_url": "https://…", "evidence_urls": [],
    "quotes": { "ter": "…", "aum": "…", "isin": "…" /* optional: "registration": "…", "index": "…" */ },  // non-empty strings; ter, aum, isin required; extra non-empty string keys are allowed and must be preserved, never stripped (r1, test finding F1)
    "us_counterparts": ["SPY", "IVV", "VOO", "SPYM"],   // tickers that must exist in etfs[]
    "index_match": { "SPY": "same", "IVV": "same" }     // keys == us_counterparts; values: same | similar
  } ]
}
```
Cross-reference invariants (tested):
- Every `etfs[].ucits_twin_ids[i]` exists in `ucits[].isin`.
- Every `ucits[].us_counterparts[j]` exists in `etfs[].ticker`.
- The links are symmetric: when X lists ISIN I, I lists X.
- No row has `exchange` of Nasdaq or Cboe.

**Display rule:** the page shows "Data k {as_of_date}" next to each row's fund size. Next to TER it shows "TER (stav k {ter_as_of})" when `ter_as_of` is non-null, otherwise "TER podle prospektu (staženo {retrieved_at})" (r1, critic m1/m6: the State Street date is the page's "Fund Information as of" date, not the date the TER took effect). Every number shown must come from this file.

### 7.3 Current contents (retrieved 2026-10-28)
Exchange verification: State Street pages list "NYSE ARCA" in Listing Information. iShares pages say "Exchange NYSE Arca". Each Vanguard page says "The fund’s ETF Shares are listed for trading on NYSE Arca". As a control, Vanguard's BND and VXUS pages say "Nasdaq", which confirms the sentence is fund-specific. Nasdaq-listed funds such as QQQ, VXUS and BND were excluded.

**US ETFs (`etfs[]`):**

| Ticker | Name | Exchange | Index | TER % | TER as of | AUM (USD) | AUM scope | AUM as of (= `as_of_date`) | Source |
|---|---|---|---|---|---|---|---|---|---|
| SPY | State Street SPDR S&P 500 ETF Trust | NYSE Arca | S&P 500 Index | 0.0945 | 2026-10-28 | 814,816,360,000 | fund | 2026-10-27 | https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-500-etf-trust-spy |
| IVV | iShares Core S&P 500 ETF | NYSE Arca | S&P 500 Index | 0.03 | not stated | 885,141,071,461 | fund | 2026-10-27 | https://www.ishares.com/us/products/239726/ishares-core-s-p-500-etf |
| VOO | Vanguard S&P 500 ETF | NYSE Arca | S&P 500 Index | 0.03 | 2026-04-28 | 1,000,000,000,000 | etf_share_class | 2026-09-30 | https://investor.vanguard.com/investment-products/etfs/profile/voo |
| SPYM | State Street SPDR Portfolio S&P 500 ETF | NYSE Arca | S&P 500 Index | 0.02 | 2026-10-28 | 185,006,720,000 | fund | 2026-10-27 | https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-portfolio-sp-500-etf-spym |
| VTI | Vanguard Morningstar Total Stock Market ETF | NYSE Arca | Morningstar US Total Market Index | 0.03 | 2026-04-28 | 689,200,000,000 | etf_share_class | 2026-09-30 | https://investor.vanguard.com/investment-products/etfs/profile/vti |
| ITOT | iShares Core S&P Total U.S. Stock Market ETF | NYSE Arca | S&P Total Market Index (TMI) | 0.03 | not stated | 97,067,184,836 | fund | 2026-10-27 | https://www.ishares.com/us/products/239724/ishares-core-s-p-total-u-s-stock-market-etf |
| VT | Vanguard Total World Stock ETF | NYSE Arca | FTSE Global All Cap Index | 0.06 | 2026-02-27 | 81,800,000,000 | etf_share_class | 2026-09-30 | https://investor.vanguard.com/investment-products/etfs/profile/vt |
| VEA | Vanguard FTSE Developed Markets ETF | NYSE Arca | FTSE Developed All Cap ex US Index | 0.03 | 2026-04-28 | 231,600,000,000 | etf_share_class | 2026-09-30 | https://investor.vanguard.com/investment-products/etfs/profile/vea |
| VWO | Vanguard FTSE Emerging Markets ETF | NYSE Arca | FTSE Emerging ACap CN A Inclus Idx | 0.06 | 2026-02-27 | 125,400,000,000 | etf_share_class | 2026-09-30 | https://investor.vanguard.com/investment-products/etfs/profile/vwo |
| IEMG | iShares Core MSCI Emerging Markets ETF | NYSE Arca | MSCI Emerging Markets Investable Market Index (USD) (Net) | 0.09 | not stated | 150,391,423,628 | fund | 2026-10-27 | https://www.ishares.com/us/products/244050/ishares-core-msci-emerging-markets-etf |
| AGG | iShares Core U.S. Aggregate Bond ETF | NYSE Arca | Bloomberg US Aggregate Bond Index | 0.03 | not stated | 139,400,019,805 | fund | 2026-10-27 | https://www.ishares.com/us/products/239458/ishares-core-u-s-aggregate-bond-etf |

Verbatim quotes (`quotes.*` in the JSON):

| Ticker | TER quote | AUM quote | Exchange quote |
|---|---|---|---|
| SPY | Fund Information as of Oct 28 2026 … Gross Expense Ratio … It can be found in the fund's most recent prospectus. 0.0945% Base Currency USD | Assets Under Management $814,816.36 M as of Oct 27 2026 | Listing Information as of Oct 28 2026 Exchange Listing Date Trading Currency Ticker CUSIP ISIN NYSE ARCA |
| IVV | Expense Ratio: Fees as stated in the prospectus 0.03% | Net Assets of Fund $885,141,071,461 as of Oct 27, 2026 | Exchange NYSE Arca |
| VOO | "expenseRatio":"0.0300","expenseRatioAsOfDate":"2026-04-28T00:00:00-04:00" | "shareClassTotalNetAssets":"$1.0 trillion","shareClassTotalNetAssetsDate":"2026-09-30T00:00:00-04:00" | The fund’s ETF Shares are listed for trading on NYSE Arca |
| SPYM | Fund Information as of Oct 28 2026 … Gross Expense Ratio … It can be found in the fund's most recent prospectus. 0.02% Base Currency USD | Assets Under Management $185,006.72 M as of Oct 27 2026 | Listing Information as of Oct 28 2026 Exchange Listing Date Trading Currency Ticker CUSIP ISIN NYSE ARCA |
| VTI | "expenseRatio":"0.0300","expenseRatioAsOfDate":"2026-04-28T00:00:00-04:00" | "shareClassTotalNetAssets":"$689.2 billion","shareClassTotalNetAssetsDate":"2026-09-30T00:00:00-04:00" | The fund’s ETF Shares are listed for trading on NYSE Arca |
| ITOT | Expense Ratio: Fees as stated in the prospectus 0.03% | Net Assets of Fund $97,067,184,836 as of Oct 27, 2026 | Exchange NYSE Arca |
| VT | "expenseRatio":"0.0600","expenseRatioAsOfDate":"2026-02-27T00:00:00-05:00" | "shareClassTotalNetAssets":"$81.8 billion","shareClassTotalNetAssetsDate":"2026-09-30T00:00:00-04:00" | The fund’s ETF Shares are listed for trading on NYSE Arca |
| VEA | "expenseRatio":"0.0300","expenseRatioAsOfDate":"2026-04-28T00:00:00-04:00" | "shareClassTotalNetAssets":"$231.6 billion","shareClassTotalNetAssetsDate":"2026-09-30T00:00:00-04:00" | The fund’s ETF Shares are listed for trading on NYSE Arca |
| VWO | "expenseRatio":"0.0600","expenseRatioAsOfDate":"2026-02-27T00:00:00-05:00" | "shareClassTotalNetAssets":"$125.4 billion","shareClassTotalNetAssetsDate":"2026-09-30T00:00:00-04:00" | The fund’s ETF Shares are listed for trading on NYSE Arca |
| IEMG | Expense Ratio: Fees as stated in the prospectus 0.09% | Net Assets of Fund $150,391,423,628 as of Oct 27, 2026 | Exchange NYSE Arca |
| AGG | Expense Ratio: Fees as stated in the prospectus 0.03% | Net Assets of Fund $139,400,019,805 as of Oct 27, 2026 | Exchange NYSE Arca |

**UCITS counterparts (`ucits[]`), all domiciled in Ireland, accumulating, share-class currency USD:**

| Ticker | ISIN | Name | Index | Index match | TER % | TER as of | Share-class AUM (USD) | AUM as of (= `as_of_date`) | Source |
|---|---|---|---|---|---|---|---|---|---|
| SPYL | IE000XZSV718 | State Street SPDR S&P 500 UCITS ETF (Acc) | S&P 500 Index | SPY: same, IVV: same, VOO: same, SPYM: same | 0.03 | 2026-10-28 | 19,701,240,000 | 2026-10-27 | https://www.ssga.com/cz/en_gb/institutional/etfs/state-street-spdr-sp-500-ucits-etf-acc-spyl-gy |
| CSPX | IE00B5BMR087 | iShares Core S&P 500 UCITS ETF (Acc) | S&P 500 Index | SPY: same, IVV: same, VOO: same, SPYM: same | 0.07 | not stated | 156,574,731,148 | 2026-10-27 | https://www.ishares.com/uk/individual/en/products/253743/ishares-sp-500-b-ucits-etf-acc-fund |
| SPYI | IE00B3YLTY66 | State Street SPDR MSCI All Country World Investable Market UCITS ETF (Acc) | MSCI ACWI IMI | VT: similar | 0.17 | 2026-09-30 | 9,430,260,000 | 2026-10-27 | https://www.ssga.com/cz/en_gb/institutional/etfs/state-street-spdr-msci-all-country-world-investable-market-ucits-etf-acc-spyi-gy |
| EIMI | IE00BKM4GZ66 | iShares Core MSCI EM IMI UCITS ETF (Acc) | MSCI Emerging Markets Investable Market Index (USD) (Net) | IEMG: same, VWO: similar | 0.18 | not stated | 42,153,956,578 | 2026-10-27 | https://www.ishares.com/uk/individual/en/products/264659/ishares-msci-emerging-markets-imi-ucits-etf |
| IUAA | IE00BYXYYM63 | iShares US Aggregate Bond UCITS ETF (USD Acc) | Bloomberg U.S. Aggregate Bond Index | AGG: same | 0.25 | not stated | 4,430,949,981 | 2026-10-27 | https://www.ishares.com/uk/individual/en/products/287339/ishares-us-aggregate-bond-ucits-etf |

Verbatim quotes:

| Ticker | TER quote | AUM quote | ISIN quote |
|---|---|---|---|
| SPYL | Fund Information as of 28 Oct 2026 … Trading Cycle DD TER 0,03% Benchmark | Fund Net Asset Value as of 27 Oct 2026 NAV USD (Official NAV) $19,13 NAV EUR €17,17 NAV GBP £14,37 NAV MXN MXN $356,56 Share Class Assets $19 701,24 M | ISIN IE000XZSV718 |
| CSPX | Total Expense Ratio 0.07% Use of Income Accumulating Domicile Ireland | Key Facts Net Assets as of 27/Oct/2026 USD 156,574,731,148 | ISIN IE00B5BMR087 |
| SPYI | TER 0,17% as of 30 Sep 2026 | Fund Net Asset Value as of 27 Oct 2026 NAV USD (Official NAV) $13,13 NAV EUR €11,78 Share Class Assets $9 430,26 M | ISIN IE00B3YLTY66 |
| EIMI | Total Expense Ratio 0.18% Use of Income Accumulating Domicile Ireland | Key Facts Net Assets as of 27/Oct/2026 USD 42,153,956,578 | ISIN IE00BKM4GZ66 |
| IUAA | Total Expense Ratio 0.25% Use of Income Accumulating Domicile Ireland | Key Facts Net Assets of Share Class as of 27/Oct/2026 USD 4,430,949,981 | ISIN IE00BYXYYM63 |

### 7.4 What could not be verified (and how it is handled)
- **TER date for iShares (US and UK) rows:** the pages show "Expense Ratio: Fees as stated in the prospectus" or "Total Expense Ratio" without a date. `ter_as_of` is `null` and the page shows the retrieval date.
- **Vanguard AUM precision:** Vanguard publishes ETF-share-class assets already rounded ("$1.0 trillion", "$689.2 billion"). We store the rounded figure as published. Vanguard's larger all-share-class fund total (for example "$1.7 trillion" for VOO) is deliberately not used.
- **Vanguard UCITS funds (VUAA, VWCE):** the vanguard.co.uk page HTML shows "OCF/TER" but no fund size or as-of date for it, so the funds were **excluded** rather than stored with null dates. State Street and iShares counterparts were used instead.
- **CSPX/EIMI fund size scope:** the figure is the "Key Facts Net Assets" value. It is smaller than "Net Assets of Fund" on the same page (CSPX: 156,574,731,148 vs 159,762,891,072, re-checked by the critic on 2026-10-28), so it is stored as `share_class`. [INFERENCE: the label does not say "Share Class" explicitly on these two pages.]
- **SCHD (Schwab):** excluded. schwabassetmanagement.com returned HTTP 403 for robots.txt, so we did not crawl it.
- No figure was estimated. Nothing is `null` in the current file.

## 8. API contract (api agent: `web/app/api/`, `web/lib/server/`)
General rules:
- Route handlers use the **Web-standard** signatures (`Request` → `Response`). Do **not** import `next/server`, `next/headers` or the `server-only` package in any file listed below, because tests import these modules directly in Vitest.
- Read environment variables **lazily**, on first use. Never read them at module top level.
- Route files export `runtime = "nodejs"`. They do **not** export `preferredRegion`: the installed Next.js 16.4 marks it deprecated ("Remove the `preferredRegion` export from your route files", `web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/preferredRegion.md`, https://nextjs.org/docs/messages/preferred-region-deprecated). The function region `fra1` is set once for the project in `web/vercel.json` (§10).
- All responses are JSON (`Response.json`).

### 8.1 Files and exported names (stable, imported by tests and web)
| File | Exports |
|---|---|
| `web/app/api/leads/route.ts` | `POST(request: Request): Promise<Response>`, `runtime`, `dynamic = "force-dynamic"`. No `preferredRegion`. |
| `web/app/api/etfs/route.ts` | `GET(): Promise<Response>`, `runtime`, `dynamic = "force-static"`. No `preferredRegion`. |
| `web/lib/server/config.ts` | `CONSENT_VERSION = "cz-2026-10-28-v2"`, `RATE_LIMIT_MAX = 5`, `RATE_LIMIT_WINDOW_SECONDS = 600`, `MAX_BODY_BYTES = 4096`, `HONEYPOT_FIELD = "website"`, `LEAD_TTL_SECONDS = 63072000` (730 days) |
| `web/lib/server/etf-schema.ts` | `EtfDatasetSchema` (Zod, per §7.2), types `EtfDataset`, `UsEtf`, `UcitsEtf` |
| `web/lib/server/etfs.ts` | `getEtfDataset(): EtfDataset`. It statically imports `../../../data/etfs.json`, validates it once, caches the result, and throws `Error("data/etfs.json failed validation: …")` when invalid. |
| `web/lib/server/lead-schema.ts` | `LeadRequestSchema` (Zod), type `LeadRequest` |
| `web/lib/server/lead-store.ts` | `type LeadRecord`, `interface LeadStore { saveIfAbsent(r: LeadRecord): Promise<"created" \| "exists">; get(email: string): Promise<LeadRecord \| null>; countLeads(variant: "a" \| "b", dateUtc: string): Promise<number> }`, `getLeadStore(): LeadStore` (a singleton per process) |
| `web/lib/server/rate-limit.ts` | `checkRateLimit(key: string): Promise<{ ok: boolean; retryAfterSeconds: number }>` |
| `web/lib/server/client-ip.ts` | `getClientIp(request: Request): string`. It returns the first entry of `x-forwarded-for` (trimmed), else `x-real-ip`, else `"unknown"`. |

### 8.2 `POST /api/leads`
Request headers: `Content-Type: application/json`. The body is at most 4096 bytes.
```json
{
  "email": "jana.novakova@example.cz",
  "consent": true,
  "consent_version": "cz-2026-10-28-v2",
  "variant": "a",
  "page_path": "/",
  "utm": { "source": "meta", "medium": "paid_social", "campaign": "etf_lp_2026q4", "content": "ad_a_fees" },
  "website": ""
}
```
Zod rules (`LeadRequestSchema`). Unknown keys are stripped, not rejected.

| Field | Rule | Error code in `fields` |
|---|---|---|
| `email` | string → trim → lowercase → max 254 chars → `z.email()` | `invalid_email` (missing, wrong type, too long, malformed) |
| `consent` | `z.literal(true)` | `consent_required` (missing, false, "true", 1) |
| `consent_version` | `z.literal(CONSENT_VERSION)`, i.e. `"cz-2026-10-28-v2"`. The old `"cz-2026-10-28-v1"` is rejected (no production lead was ever stored with it). | `invalid_consent_version` |
| `variant` | `z.enum(["a","b"])` | `invalid_variant` |
| `page_path` | `z.enum(["/","/b"])` | `invalid_page_path` |
| `utm` | optional object. Keys `source`, `medium`, `campaign`, `content` and `term` are each optional, string, trimmed, max 100. Other keys are stripped. | `invalid_utm` |
| `website` | honeypot. Optional string. | (never a validation error; see step 5) |

Processing order (the tests rely on it):
1. **Rate limit.** Key `leads:<clientIp>`, 5 requests per 600 s sliding window. **Every** POST counts, including invalid ones. When exceeded, return **429** `{"ok":false,"error":"rate_limited"}` with header `Retry-After: <integer seconds ≥ 1>`.
2. **Content type.** If the `content-type` header does not contain `application/json`, return **415** `{"ok":false,"error":"unsupported_media_type"}`.
3. **Size.** If the body is over 4096 bytes (measured on the read text), return **413** `{"ok":false,"error":"payload_too_large"}`.
4. **JSON.** If parsing fails or the result is not a plain object, return **400** `{"ok":false,"error":"invalid_json"}`.
5. **Honeypot.** If `website` is a string that is non-empty after trim, return **200** `{"ok":true}`. Nothing is stored and nothing is counted.
6. **Validation.** On failure, return **422** `{"ok":false,"error":"validation_failed","fields":{"<field>":"<code>", …}}`. Every failing field is listed.
7. **Store.** Call `saveIfAbsent` with the record built from the request. On `"created"`, increment the per-variant daily counter (§8.4). On `"exists"`, change nothing: the original consent record is kept. Both return **200** `{"ok":true}`. The response is the same in both cases so it does not reveal whether an email exists.
8. **Store or rate-limit backend failure:** return **500** `{"ok":false,"error":"server_error"}`. Log one JSON line `{"event":"lead_store_failed","email_hash":"<first 12 hex of sha256>","message":"…"}`. **Never log a full email**, in any log line.

Every response from this route has the header `Cache-Control: no-store`. Methods other than POST get Next's default 405 (not tested).

`LeadRecord` stored:
```ts
type LeadRecord = {
  email: string;                 // normalised (trimmed, lowercased)
  consent: true;
  consent_version: "cz-2026-10-28-v2";
  consented_at: string;          // server time, ISO 8601 UTC
  variant: "a" | "b";
  page_path: "/" | "/b";
  utm: { source?: string; medium?: string; campaign?: string; content?: string; term?: string };
};
```
No IP address and no user agent are stored (data minimisation).

### 8.3 `GET /api/etfs`
- **200**: the body is exactly the validated dataset object (§7.2). Header `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800`.
- **500**: `{"ok":false,"error":"data_invalid"}` if validation throws.
- The page itself does **not** fetch this endpoint. Server components call `getEtfDataset()` directly. The endpoint exists for transparency and reuse.

### 8.4 Storage: Upstash Redis (free tier) via the Vercel Marketplace
- Upstash free tier: "Data Size 250 MB … Monthly Commands 500K" (https://upstash.com/pricing/redis, retrieved 2026-10-28). Choose the region **eu-central-1 (Frankfurt)**.
- Keys:
  - `lead:v1:<sha256hex(email)>`: JSON `LeadRecord`, written with `SET … NX EX 63072000` (`LEAD_TTL_SECONDS`). So a lead is deleted at the latest 24 months after consent, as §5.8 promises, even if no email is ever sent. `"created"` when the SET succeeded, `"exists"` otherwise. A duplicate does not refresh the TTL. The memory driver may ignore the TTL.
  - `stats:leads:<variant>:<YYYY-MM-DD UTC>`: `INCR` on `"created"`. This counts conversions server-side, independent of analytics consent.
  - Rate limiting: `@upstash/ratelimit` `Ratelimit.slidingWindow(5, "600 s")` with prefix `rl:leads`.
- Driver switch `STORAGE_DRIVER`:
  - `upstash` (default): uses `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. If either is missing at request time, the route returns 500 `server_error`.
  - `memory`: an in-process Map for the store, the counters and a sliding-window rate limiter. It is used by tests and local e2e. It is **refused when `VERCEL_ENV === "production"`**: the route returns 500 `server_error` and logs `{"event":"memory_driver_in_production"}`.
- If the Vercel Upstash integration injects `KV_REST_API_URL`/`KV_REST_API_TOKEN` instead, set the two `UPSTASH_*` variables in Vercel to the same values. Code reads only the `UPSTASH_*` names.

### 8.5 Environment variables (`web/.env.example`, created by the web agent, all listed)
```
# Server (api)
STORAGE_DRIVER=upstash            # upstash | memory (memory refused on VERCEL_ENV=production)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
# Client (web)
NEXT_PUBLIC_UMAMI_WEBSITE_ID=     # empty = events are only mirrored to window.__lpEvents
NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://cloud.umami.is/script.js
NEXT_PUBLIC_UMAMI_DOMAINS=        # optional, comma list, e.g. the production domain (keeps preview deploys out)
```

## 9. Analytics
### 9.1 Tool: Umami Cloud (Hobby plan), loaded only after consent
- Free tier: "Hobby $0 / month … Up to 100K events per month … 6 month data retention" (https://umami.is/pricing, retrieved 2026-10-28).
- Cookies: "Umami's web tracker does not use cookies." (https://docs.umami.is/docs/faq, retrieved 2026-10-28).
- Custom events via `umami.track(event_name, data)`. "Event names are limited to 50 characters." (https://docs.umami.is/docs/tracker-functions, https://docs.umami.is/docs/track-events).
- Funnel report: "Create a funnel report in Umami to see how many visitors complete a sequence of page visits or events, and where they drop off between steps." (https://docs.umami.is/docs/funnel). UTM report: https://docs.umami.is/docs/utm.
- **Why not Vercel Web Analytics:** "Custom Events are available on Enterprise and Pro plans" (https://vercel.com/docs/analytics/custom-events, retrieved 2026-10-28), and the funnel needs custom events.

### 9.2 Client module (web): `web/lib/analytics.ts`
Exports:
- `track(name: EventName, props?: Record<string, string | number | boolean>)`
- `grantAnalyticsConsent()`
- `denyAnalyticsConsent()`
- `getAnalyticsConsent(): "granted" | "denied" | "unset"`

Behaviour:
- **Common props** are merged into every event: `variant` (`"a"|"b"`), plus `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` and `utm_term` when present in the landing URL. They are read once on load. Empty values are omitted.
- **Consent `unset`:** events go to an in-memory queue (max 50, oldest dropped). Nothing is sent. Nothing is added to `window.__lpEvents`. The Umami script is **not** loaded.
- **`grant`:**
  1. Persist `localStorage.lp_analytics_consent = "granted"`.
  2. Inject `<script defer src={NEXT_PUBLIC_UMAMI_SCRIPT_URL} data-website-id=… [data-domains=…]>`, only if the website ID is set. Umami's automatic pageview fires on load and records the URL with UTMs.
  3. Flush the queue in order.
- **`deny`:** persist `"denied"`, clear the queue, never send.
- **Sending an event** means calling `window.umami.track(name, props)` if Umami is loaded, or queueing until its script `onload`. **Always** also push `{ name, props, ts }` to `window.__lpEvents`, an array created on first send. This test hook is harmless and contains no PII.
- **Return visit:** a stored `"granted"` loads Umami immediately, and a stored `"denied"` never does.
- **Never** send the email, any part of it, or any free-text input.

### 9.3 Consent bar (`consent-bar`), Czech draft
"Smíme měřit, jak se stránka používá? Statistiky bez cookies přes Umami, jen se souhlasem. [Povolit] (`consent-accept`) [Odmítnout] (`consent-reject`) · [Více](/soukromi)"
- It is a non-modal bottom bar, ≤ 88 px tall, and never covers the hero CTA. It is shown on first visit when consent is `unset`.
- The footer link `consent-settings` reopens it.
- While it is visible, `sticky-cta` is hidden.

### 9.4 Event contract (exact names; Umami limit ≤ 50 chars)
| Event | Fires when (once unless stated) | Extra props |
|---|---|---|
| `lp_view` | Landing component mounted | `viewport_w` (number) |
| `scroll_depth` | First time the page reaches 25 / 50 / 75 / 100 % depth (each once). Depth = (scrollY + innerHeight) / scrollHeight; 100 means ≥ 0.98. | `depth` (25\|50\|75\|100) |
| `section_view` | A section is ≥ 50 % visible for the first time (IntersectionObserver) | `section`: `calc`\|`priips`\|`form`\|`etf_table`\|`faq` |
| `value_view` | The visitor has seen the page's value: the first time `calc-result` **or** `priips-note` meets the `section_view` visibility rule (≥ 50 % of the element visible, or it fills ≥ 50 % of the viewport). Once per page load. Funnel step 2. | `source`: `calc`\|`priips` (whichever came first) |
| `form_view` | The `#formular` section (form or thank-you) meets the `section_view` rule for the first time, in the same tick as `section_view` with `section=form`. Once. Funnel step 3. | (none) |
| `calc_interact` | First change of each control | `control`: `amount_chip`\|`amount_input`\|`years`\|`etf_a`\|`etf_b` |
| `calc_result` | 1000 ms after the last calculator change that produced a valid new result. Max 10 per page load. | `amount_czk`, `years`, `etf_a`, `etf_b`, `fee_diff_czk` (rounded) |
| `cta_click` | Every click on a CTA | `location`: `hero`\|`calc_unlock`\|`priips`\|`sticky` |
| `form_start` | First focus or input on `lead-email` | (none) |
| `form_submit` | Submit that passed the client checks, just before `fetch` | (none) |
| `form_error` | Client check failed or the API returned non-200 / network error. Every occurrence. | `reason`: `invalid_email`\|`consent_missing`\|`rate_limited`\|`validation_failed`\|`server_error`\|`network` |
| `lead_success` | The API returned 200 `{ok:true}` | (none) |
| `value_interact` | In the thank-you state: copy ISIN or open a UCITS source. Every occurrence. | `action`: `copy_isin`\|`open_source`, `isin` |
| `source_click` | Click on an ETF-table source link (`source_url`, or `etf-evidence-{TICKER}` for Vanguard). Every occurrence. | `ticker`, `link`: `page`\|`data` |

**Funnel (Umami Funnel report).** A funnel step is a "Viewed page" URL or a "Triggered event" name. Steps cannot filter on event properties ("Umami supports specific URLs, events, and URL wildcards as steps", https://docs.umami.is/docs/funnel, retrieved 2026-10-28). So every step is a distinct event name, and the variant split uses the URL. Create two funnels, window 60 minutes:
- **A:** Viewed page `/` → `value_view` → `form_view` → `form_start` → `form_submit` → `lead_success`
- **B:** Viewed page `/b` → `value_view` → `form_view` → `form_start` → `form_submit` → `lead_success`

[INFERENCE: Umami matches the URL step on the path without the UTM query. Verify with one test session per route after §15 Q8.] `calc_result` (calculator engagement) and `section_view` are side metrics, not funnel steps. Reason (critic r1 M1): a visitor can convert from the default result, or on `/b` from the PRIIPs block, without touching the calculator.
**Ground truth for leads:** the Upstash `stats:leads:*` counters. **Arrivals:** Meta "landing page views" (Umami sees only consented sessions). Whether Meta reports them without a pixel is open (§15 Q6). README must state this coverage limit.

## 10. Stack and file ownership
- **One Next.js project in `web/`.** Use the latest stable `create-next-app` with App Router, TypeScript `strict`, ESLint, Tailwind CSS, no `src/` dir and import alias `@/*` → `web/*`. Use npm and Node 22 LTS. Prettier is configured.
- `next.config.ts` (web) must set `outputFileTracingRoot` and `turbopack.root` to `path.join(__dirname, "..")`, so the static import of `data/etfs.json` (outside `web/`) builds locally and on Vercel.
- Fonts: `next/font` with subsets `["latin", "latin-ext"]` (Czech diacritics). `<html lang="cs">`.
- **Vercel:** one project with Root Directory `web` and the Next.js preset. Functions run in `fra1`, set by `web/vercel.json`: `{ "$schema": "https://openapi.vercel.sh/vercel.json", "regions": ["fra1"] }`. Vercel: "To change the default region in your `vercel.json` … add the region code(s) to the `"regions"` key". The default for new projects is `iad1`, and Hobby allows a single region (https://vercel.com/docs/functions/configuring-functions/region, retrieved 2026-10-28). Env vars per §8.5. "Include files outside the root directory" must stay enabled, since the build reads `../data`. [ASSUMPTION: this is the Vercel default; verify at deploy.]
- **Dependencies:** the web agent's **first commit** is the scaffold with **all** runtime deps installed, including the api agent's: `zod@^4`, `@upstash/redis`, `@upstash/ratelimit`. The api agent never edits `package.json`. If it needs another dep, it files it in `docs/decisions.md`. Nothing else is added: no UI kit, no chart library, no analytics npm package.
- **Tests:** a separate npm project in `tests/` (`vitest`, `@playwright/test`, `zod`, `typescript`, `@types/node`).
  - Vitest alias `@` → `../web`. Imports inside `web/` files resolve from `web/node_modules`, so run `npm ci` in `web/` first.

| Path | Owner | Notes |
|---|---|---|
| `web/app/api/**` | api | `leads/route.ts`, `etfs/route.ts` |
| `web/lib/server/**` | api | files in §8.1 |
| `web/app/layout.tsx`, `web/app/page.tsx` (variant a), `web/app/b/page.tsx` (variant b), `web/app/soukromi/page.tsx` | web | pages are `force-static`; read data via `getEtfDataset()` |
| `web/components/**`, `web/lib/fees.ts`, `web/lib/analytics.ts`, `web/lib/format.ts`, `web/lib/site-config.ts` | web | client islands: calculator, form/thank-you, consent bar, sticky CTA |
| `web/package.json`, `web/next.config.ts`, `web/vercel.json`, `web/tsconfig.json`, `web/.env.example`, lint/format configs | web | |
| `tests/**` | tests | must not read `web/` source |
| `data/etfs.json`, `docs/plan.md`, `docs/ads.md` | architect | changes go through the architect |
| `docs/decisions.md` | everyone, append-only | one line per decision |
| `docs/test-findings.md` | tests | |

**Exports other agents may rely on.** web imports `getEtfDataset` and the types from the api's files (type-only imports in client components). tests import every module in §8.1, plus `totalFeeCzk` from `web/lib/fees.ts`.

### 10.1 Tests agent: required cases (contract-derived)
- **API, Vitest.** Set `process.env.STORAGE_DRIVER = "memory"` before importing. Use a unique `x-forwarded-for` IP per test so the rate-limit buckets stay independent. Cases:
  - Valid lead returns 200 `{ok:true}`. After it, `getLeadStore().get(email)` returns a record with the normalised email, `consent: true` and the `consent_version`. `countLeads` goes up by 1.
  - A duplicate returns 200 `{ok:true}` and the count is unchanged.
  - Uppercase or whitespace in the email is stored normalised.
  - Invalid email returns 422 with `fields.email == "invalid_email"`.
  - Missing, false or `"true"` consent returns 422 with `fields.consent == "consent_required"`.
  - A wrong `consent_version`, including the old `"cz-2026-10-28-v1"`, returns 422 with `fields.consent_version == "invalid_consent_version"`.
  - A bad `variant` or `page_path` returns 422.
  - A filled honeypot returns 200 and nothing is stored.
  - Malformed JSON returns 400.
  - Wrong content type returns 415.
  - A body over 4096 bytes returns 413.
  - The 6th request from the same IP within the window returns 429 with a `Retry-After` header.
  - Every error body matches `{ok:false,error:string}`.
  - `GET /api/etfs` returns 200 and the body passes the tests' own schema and equals `data/etfs.json` (no quote key stripped).
  - Neither route module exports `preferredRegion`. `web/vercel.json` has `regions: ["fra1"]` (tests may read this one config file). `LEAD_TTL_SECONDS === 63072000`.
- **Data, Vitest.** `data/etfs.json` validates against §7.2. The cross-reference invariants hold. Every row has `source_url` (https), `as_of_date`, and non-empty `quotes`. No exchange is Nasdaq or Cboe.
- **Unit, Vitest.** `totalFeeCzk` reproduces the fixtures in §6.2 to ±0.01.
- **E2E, Playwright.** Mobile Chromium, viewport 360×740, `isMobile`, `hasTouch`. The server runs `web` via `next build && next start` with `STORAGE_DRIVER=memory`. Cases:
  - Hero H1 for `/` and `/b` matches the §5.1 / ads.md text, and `hero-cta` is in the viewport without scrolling. With the consent bar closed, tapping `hero-cta` on `/` leaves `calc-diff` fully in the viewport; on `/b` it brings `priips-note` into view.
  - The calculator shows the default fixture (SPY 9 366 Kč, SPYM 1 996 Kč, diff 7 369 Kč).
  - Changing the inputs updates the result per the fixtures.
  - `calc-unlock-cta` scrolls `lead-form` into view.
  - The consent checkbox is unchecked by default. Submitting without consent shows `lead-error` and makes no request.
  - A valid submit shows `thank-you` with the `ucits-row-*` entries for the selected ETFs' twins and the `thank-you-fees` line, and `calc-unlock` switches to the `calc-ucits-fee-*` rows. Both follow the §6.2 UCITS fixtures.
  - `sticky-cta` is hidden while `calc-unlock-cta` is in the viewport.
  - `etf-row-SPY` links to its `source_url` and shows its as-of date.
  - `risk-disclaimer` and `privacy-link` are present, and `/soukromi` renders.
  - **Analytics:** before consent, `window.__lpEvents` is undefined or empty. After `consent-accept`, `lp_view` is present (flushed). The full flow produces every event name in §9.4 except `form_error` (that one is covered by its own invalid-submit test) and `source_click`/`value_interact` (each clicked once in its own test). `value_view` and `form_view` fire exactly once. On `/b`, `hero-cta` → valid submit without touching the calculator produces `value_view` with `source: "priips"`, then `form_view`, `form_start`, `form_submit`, `lead_success`, and no `calc_result`. After `consent-reject`, no events are recorded.

## 11. Done criteria
1. `web/`: `npm run build`, `npm run lint` and `npx tsc --noEmit` pass from a clean clone. `tests/`: Vitest and Playwright pass. There are no skipped tests.
2. `/` and `/b` render the hero from `docs/ads.md`. `/soukromi` renders. Both landing routes are statically generated.
3. Every number on the page comes from `data/etfs.json` and shows its as-of date and source link. The only derived numbers are the calculator outputs and the hero ratio. No hardcoded figures.
4. Lead flow works on the Vercel production URL with Upstash: the record is visible in the Upstash data browser and `stats:leads:*` increments. Repeat submissions give 200 and nothing is overwritten. Rate limit and honeypot behave per §8.2.
5. Phone test on a real device with consent granted: all §9.4 events appear in Umami with `variant` and UTM props. With consent rejected, none appear.
6. Compliance (§12): the consent checkbox is unchecked by default, the disclaimer is visible, the privacy notice is reachable, the PRIIPs note is present, and there is no "buy"/"best" wording. **`site-config.ts` contains the real operator data**, which the production build enforces (§5.7).
7. Lighthouse mobile on `/`: Performance ≥ 90 and Accessibility ≥ 90 (measured, with the numbers recorded in README).
8. README covers §14. `docs/decisions.md` is complete. `ai-log/` is committed.

**If behind schedule, cut in this order:** (1) `etf-sort-ter` toggle, (2) the sticky CTA, (3) copy-ISIN buttons. **Never cut** real data, sources and dates, consent, the disclaimer, or measurement.

### 11.1 Assumptions
- A1. The audience reads Czech. Only the page copy is localised; data labels (index names) stay in English.
- A2. Meta is the only paid channel at launch. Ads link to `/` (A) and `/b` (B) with the UTM scheme in `docs/ads.md`.
- A3. Fund-cost comparison ignores broker fees, FX and taxes, and the page says so. The calculator uses 0 % growth, so it shows no return projections.
- A4. The dataset is static until manually refreshed. Values are as of 2026-09-30 (Vanguard AUM) and 2026-10-27/28 (the rest), and that is acceptable for an educational comparison.
- A5. Vercel includes files outside the Root Directory in the build (needed for `../data`).
- A6. Umami Cloud Hobby (100K events/month) is enough for the test budget.
- A7. No email is sent at launch. The value is delivered on the page. The first marketing email needs an ESP and double opt-in decision (§15).
- A8. Conversion estimate inputs in §14 are assumptions except where a source is given.

## 12. Compliance (decisions logged in `docs/decisions.md`)
- **US ETFs and PRIIPs.** The page is an **educational comparison**. It states plainly, before the form, that Czech/EU retail investors generally cannot buy US-domiciled ETFs at EU brokers because there is no PRIIPs KID. Sources:
  - EP question E-004745/2021: "Since 2018, ordinary investors in the European Union cannot invest in US exchange-traded funds (US ETFs) … US ETFs do not provide such a document."
  - justETF (https://www.justetf.com/en/news/etf/us-domiciled-etfs.html): "If you already own a US-domiciled ETF then you can hold or sell it but you won't be able to buy more until a PRIIPs compatible KID becomes available."
  - The page then offers UCITS counterparts tracking the same or a similar index. The State Street UCITS pages list "Countries of Registration Austria, Czech Republic, …" and link a "KID (CS)". The iShares rows do not state Czech registration in our quotes, so the page must not claim availability at any specific broker.
- **No investment advice.**
  - Copy uses "srovnání", "sleduje stejný index" and "evropská alternativa". It never uses "kupte", "doporučujeme" or "nejlepší".
  - No return projections, only cost.
  - The FAQ answers "Je to investiční doporučení? Ne."
- **Risk disclaimer:** in the footer (§5.7), visible without interaction.
- **GDPR:**
  - Marketing consent is a separate, **unchecked** checkbox with a versioned text (`cz-2026-10-28-v2`), stored with a timestamp.
  - The privacy notice is at `/soukromi`.
  - Data minimisation: no IP or UA is stored with a lead. The IP is only a short-lived rate-limit key, and the notice says so (§5.8).
  - Upstash stores data in the EU (Frankfurt), and Vercel functions run in `fra1` (`web/vercel.json`). All three processors are US companies. The notice discloses the transfers and their sourced mechanisms (§5.8 section 5).
  - Retention is enforced: lead keys expire 24 months after consent (§8.4).
- **Unlock conditional on marketing consent.** The trade (list for newsletter consent) is stated explicitly in the form text and the FAQ. Under GDPR Art. 7(4) this "conditionality" carries legal risk, so it is flagged for legal review (§15, Q5).
- **Double opt-in:** **not at launch.** Single opt-in with the consent text version and timestamp recorded. No email is sent by the system. DOI must be in place before the first marketing send (§15, Q4).
- **The gate is cosmetic** (critic r1 m5, accepted). The UCITS rows are in the static HTML and in `GET /api/etfs`. That is fine for an educational list of public data. Never call the list exclusive ("exkluzivní", "jen u nás") in ads or on the page.
- **Analytics consent:**
  - Umami loads only after opt-in. This follows a conservative reading of EDPB Guidelines 2/2023 on the technical scope of Art. 5(3) ePrivacy (v2.0, adopted 7 Oct 2024, https://www.edpb.europa.eu/documents/guideline/guidelines-22023-on-technical-scope-of-art-53-of-eprivacy-directive_en).
  - Lead counts are measured server-side without personal data.
  - Ad-platform pixels are **not** included, because they would need a full consent manager (§15, Q6).
- **US withholding tax / W-8BEN:** **not mentioned.** It is irrelevant to the UCITS path, and we did not cite a primary source. Logged.
- **Vercel Hobby plan:** the docs say the "Hobby plan restricts users to non-commercial, personal use only" (https://vercel.com/docs/plans/hobby, retrieved 2026-10-28). A paid ad campaign is commercial, so production needs Pro (§15, Q2).

## 13. Thank-you state (`thank-you`), delivered immediately
The thank-you state replaces `lead-form` in place. The page scrolls it into view and moves focus to its heading (`tabindex="-1"`). It also sets `localStorage.lp_unlocked = "1"`, so a reload shows the unlocked state again without refiring `lead_success`.
1. **Heading:** "Hotovo. Tady jsou evropské alternativy."
2. **Personal line** `thank-you-intro`, built from the calculator's current ETF A/B: "Porovnávali jste {A} a {B} ({index label})." (only "{A}" when A = B), then one of:
   - "Stejný index sledují tato evropská ETF:"
   - "Stejný nebo podobný index sledují tato evropská ETF:"
   - no twins: "Pro tato ETF nemáme v přehledu evropskou alternativu. Ostatní evropská ETF najdete níže."

   Index label (critic r1 m1): strip a trailing " Index" from `index`. If A and B have the same index, use "index {X}", otherwise "indexy {X} a {Y}". Example: "Porovnávali jste SPY a SPYM (index S&P 500). Stejný index sledují tato evropská ETF:".
3. **Fee line** `thank-you-fees` (critic r1 M3), only when there are twins: "Poplatek fondu za {years} let při {amount} Kč: {T1} {fee1} Kč, {T2} {fee2} Kč (rozdíl {diff} Kč)." Twins are in TER-ascending order. The "(rozdíl …)" part appears only with 2 or more twins. Amount and years are the calculator's last valid values, formatted as in §6.2. At the defaults: "Poplatek fondu za 20 let při 500 000 Kč: SPYL 2 991 Kč, CSPX 6 954 Kč (rozdíl 3 962 Kč)." Below it, the cards for the twins of A and B, ordered by TER ascending.
4. **Other counterparts:** the remaining `ucits[]` rows under "Další indexy".
5. **Each card** (`ucits-row-{ISIN}`) shows:
   - name and ticker
   - **ISIN** with a copy button (`copy-isin-{ISIN}`; clipboard API, with a "Zkopírováno" toast)
   - TER with its date rule (§7.2), fund size with its scope label and "Data k {as_of_date}" (§5.5)
   - index with the match badge "stejný index jako {list}" / "podobný index jako {list}", the list joined with `Intl.ListFormat("cs", { type: "conjunction" })` (e.g. "stejný index jako SPY a SPYM", critic r1 m1), plus "Irsko · akumulační"
   - source link
6. **Checklist "Než něco koupíte"** (Czech, factual, not advice):
   1. U brokera hledejte podle ISIN. Tickery se na evropských burzách liší.
   2. Ověřte, že k ETF je k dispozici dokument KID. Bez něj vám ho broker zpravidla neprodá.
   3. Porovnejte nejen TER, ale i poplatky brokera a za převod měny.
   4. Akumulační ETF dividendy reinvestuje, distribuční je vyplácí.
7. **Next step:** the link "Projít celé srovnání amerických ETF" scrolls to `etf-table`. Also the line: "Až se poplatky těchto ETF změní, dáme vám vědět e-mailem."
The calculator's locked row (`calc-unlock`) turns into the unlocked UCITS rows (§6.1) at the same time.

## 14. README requirements (written at stage 5; these are the inputs)
The README must contain the CLAUDE.md sections (run, results, decisions, known gaps, how AI was used) **plus**:

### 14.1 Section-order rationale
Copy the table in §5. Adjust it only if the shipped order differs, and log any change.

### 14.2 Expected conversion: lead_success ÷ landing-page views
- **Benchmarks (sourced):** Unbounce Conversion Benchmark Report, Finance & Insurance (https://unbounce.com/conversion-benchmark-report/finance-insurance-conversion-rate/, retrieved 2026-10-28):
  - "investing is struggling to keep up, with a conversion rate of just 3.9%"
  - "the overall financial services median conversion rate of 8.3%"
  - "Paid search (10.1%) and paid social (9.3%) are beating out email (7.9%)"
  - All-industry median: "around 6.6% across all industries as of Q4 2024" (https://unbounce.com/average-conversion-rates-landing-pages)
- **Our estimate: about 4 % (plausible range 2.5–6 %). This is an assumption, not a measurement.** Reasoning:
  - Base: the investing subcategory median, 3.9 %.
  - Up: tight ad-to-hero message match, a single field, and tangible gated value shown right after a personal Kč result.
  - Down: cold Czech traffic, the requirement to tick a marketing-consent box, and the analytics consent bar adding friction.
- **Funnel assumptions (all assumptions, for later comparison with real data):**

| Step | Share of visits |
|---|---|
| `lp_view` | 100 % |
| `value_view` (calculator result or PRIIPs block seen) | 60 % |
| `form_view` | 35 % |
| `form_start` | 9 % |
| `form_submit` | 5 % |
| `lead_success` | 4 % |

- **Measurement caveat:** Umami covers consented sessions only. Overall CR = Upstash lead counter ÷ Meta landing-page views.

### 14.3 Three A/B hypotheses, ranked by expected impact
Sample sizes use a two-proportion z-test (α = 0.05 two-sided, power 0.8) at a 4 % baseline: **4 783** visits per arm to detect +30 % relative (4.0 → 5.2 %), **10 317** for +20 %, and **17 943** for +15 %. The primary metric is always `lead_success / lp_view` by `variant`. Guardrail: `form_error` rate.
1. **Inline ask in the calculator result (highest).** Put the email field, consent and button directly inside `calc-result`, instead of in a separate section after the PRIIPs block. Why: it asks at the moment of peak intent and removes a scroll step on mobile. Expected +20–30 % relative.
2. **Live proof in the hero (medium).** Show a mini result inside the hero ("SPY vs SPYM, 500 000 Kč, 20 let: rozdíl 7 369 Kč") instead of text-only. Why: the value lands in the first screen, before any scroll. It keeps message match with ad A. Expected +10–20 % on `calc_result` and downstream.
3. **Sticky CTA on vs off (lowest).** Why: it recovers visitors who scroll past, but adds UI noise. Expected ±5–10 %. Run it only after 1 and 2.

## 15. Open questions for the user (blocking items marked ⛔)
1. ⛔ **Operator identity** for the footer and privacy notice: legal name, IČO, address, contact email. We cannot launch without them, and the production build refuses to run until they are set. (Critic r1 B1: footer and `/soukromi` still show the gap text, so visitors cannot exercise their rights.)
2. ⛔ **Vercel plan.** Hobby is non-commercial only. Approve Pro for the production project, or confirm another arrangement. (Critic r1 B2.)
3. **Analytics consent stance.** We chose opt-in for Umami (conservative). If your counsel accepts cookieless analytics without consent, measurement coverage rises a lot. That is a one-line change in `web/lib/analytics.ts`, and it would need a plan update.
4. **Double opt-in and ESP** before the first marketing email (no email is sent at launch). The microcopy "Žádný spam. Odhlásit se můžete kdykoli." and "Až se poplatky těchto ETF změní, dáme vám vědět e-mailem." depend on it: the first send needs DOI and an unsubscribe link (critic r1 m7).
5. **Legal review** of "unlock in exchange for newsletter consent" (GDPR Art. 7(4); critic r1 M6, major, not a blocker). Choose: (a) keep as is after counsel's OK; or (b) the fallback without a redesign: the checkbox becomes optional, unlock needs the email only, only consented leads are ever mailed, and the metric becomes mailable leads. (b) needs a plan change: new consent text and version, `consent` becomes a boolean in §8.2, `consent: false` leads are stored, and §14 splits the success metric. Not implemented until you decide.
6. **Meta conversion signal** (critic r1 M2, major). There is no Meta Pixel or Conversions API, so Ads Manager can neither optimise for nor report leads per ad. Choose: (a) launch on a Traffic / landing-page-views objective knowingly and read leads per variant daily from the Upstash `stats:leads:<variant>:<date>` counters (a readout script would need a plan change); or (b) add a pixel or CAPI `Lead` event sent only after analytics consent (needs a consent-manager decision and a plan change). [INFERENCE from the critic: Meta measures landing-page views through its pixel. Check in Ads Manager whether LPV reporting works without one, since §9.4 "arrivals" rely on it.]
7. **Meta ad review for financial products in CZ:** check in Ads Manager whether advertiser verification or a special category applies. Not verified here.
8. ⛔ **Umami Cloud site** (critic r1 B3). Create the Umami Cloud Hobby site with data region **EU** ("Umami Cloud offers US and EU data regions, selected during account setup", read-only afterwards: https://docs.umami.is/docs/cloud/faq). §5.8 states the EU region. Set `NEXT_PUBLIC_UMAMI_WEBSITE_ID` and `NEXT_PUBLIC_UMAMI_DOMAINS` in the Vercel production env. Also set `NEXT_PUBLIC_UMAMI_SCRIPT_URL` if the dashboard's tracking snippet uses another script host (not verified for the EU region). Then create the two funnels from §9.4. Until then no funnel event leaves the browser.
9. ⛔ **Production Redis** (critic r1 B4). Connect Upstash (eu-central-1, Frankfurt) via the Vercel Marketplace and set `UPSTASH_REDIS_REST_URL/TOKEN` (§8.4). Then do one real submit on the production URL and check the record and `stats:leads:*` (§11 item 4).
10. ⛔ **Privacy notice sign-off** (critic r1 M5). The §5.8 text is drafted from vendor documents, not legal advice. Before launch, the operator confirms three things: the Umami account's data region is EU (Q8); Upstash has an active entry on https://www.dataprivacyframework.gov/list (its DPA says it uses the DPF, but the listing page did not render for us, so the listing itself is unverified); and no other processor is used. Then counsel signs off §5.8.
11. ⛔ **Pre-launch measurements** (critic r1 m9; owner main/user): Lighthouse mobile (§11 item 7), real-phone test with consent (§11 item 5), and the production lead check (§11 item 4).

## Changelog r1 (2026-10-28, after critic round 1)
Inputs: `docs/critic.md`, `docs/test-findings.md`, the installed Next.js 16.4 docs. One line per accept/reject is in `docs/decisions.md`. `data/etfs.json` is unchanged.
**Changed sections:** header, §2, §3, §4, §5 (table, 5.1, 5.3, 5.4, 5.5, 5.6, 5.8), §6.1, §6.2, §7.2, §7.4, §8 (intro, 8.1, 8.2, 8.4), §9.4, §10, §10.1, §12, §13, §14.2, §15. `docs/ads.md`: variant A visual brief, variant B copy, hero and claim heading, and the "what we measure" list.

### web
1. `/b` hero (ads.md): H1 "Proč u brokera nenajdete VOO – a která ETF sledují stejný index"; sub "Americká ETF zpravidla nemají dokument KID, který EU vyžaduje pro drobné investory. Porovnejte jejich poplatky a odemkněte evropské alternativy se stejným indexem."; `hero-cta` label "Ukázat evropská ETF", scrolls to `priips-note`.
2. `/` hero: after tapping `hero-cta` (consent bar closed), `calc-diff` is fully in the viewport and not under `sticky-cta`.
3. `sticky-cta`: also hidden while `calc-unlock-cta` is in the viewport. Label "Odemknout evropské alternativy".
4. "protějšek" → "alternativa" everywhere:
   - PRIIPs CTA and sticky CTA: "Odemknout evropské alternativy"
   - lead-form section label: "Evropské alternativy"
   - lead-form text: "Odemkněte přehled evropských (UCITS) alternativ: …"
   - FAQ 2: "Výměnou za přehled evropských alternativ …"
   - thank-you heading: "Hotovo. Tady jsou evropské alternativy."
   - thank-you no-twin text: "Pro tato ETF nemáme v přehledu evropskou alternativu. Ostatní evropská ETF najdete níže."
   - calc no-twin text: "Pro tento index nemáme v přehledu evropskou alternativu."
   - `/soukromi` local storage line: "že jste přehled evropských alternativ už odemkli"
5. `calc-unlock`: locked text "Evropská alternativa: 🔒 ISIN, TER a poplatek v Kč po odemčení". The unlocked state is new: title "Evropské alternativy pro stejnou částku a dobu:", rows `calc-ucits-fee-{ISIN}` "{ticker} · {TER} · {fee} Kč" (+ " · podobný index"), and `calc-ucits-diff` "Rozdíl mezi nimi za {years} let: {diff} Kč" (§6.1, §6.2 fixtures).
6. Calculator footnote: "Počítáme jen poplatek fondu (TER): každý rok si fond strhne TER z hodnoty investice. Zhodnocení, poplatky brokera, daně ani kurzové rozdíly nepočítáme. Ilustrace nákladů, ne předpověď výnosu." FAQ 4 gains the sentence "Kalkulačka počítá poplatek za n let jako částka × (1 − (1 − TER)ⁿ), bez zhodnocení."
7. Thank-you:
   - personal line index label "(index S&P 500)" / "(indexy X a Y)"
   - new `thank-you-fees` line (§13 item 3)
   - badges joined with "a" ("stejný index jako SPY a SPYM")
8. Data labels:
   - "TER (stav k {date})" / "TER podle prospektu (staženo {date})"
   - fund size always "… mld. USD" with max. 1 decimal (VOO "1 000 mld. USD")
   - scope labels "celý fond" / "jen ETF třída akcií" / "jen tato třída akcií"
   - new table note (§5.5)
   - new link `etf-evidence-{TICKER}` "zdrojová data (JSON)" on Vanguard rows
9. Consent label ends "Souhlas mohu kdykoli odvolat." The version comes from `CONSENT_VERSION` (now v2).
10. `/soukromi`: §5.8 verbatim. Sections renumbered 1–9, new "5. Předávání mimo EU".
11. Analytics:
   - new events `value_view` (`source`: calc|priips) and `form_view`
   - `source_click` gains `link`: page|data
   - `section_view` and `calc_result` are unchanged
12. New `web/vercel.json` with `"regions": ["fra1"]`.
13. README (stage 5): the funnel is §9.4's two URL-split funnels, `value_view`/`form_view` as steps 2/3, and §14.2's table.

### api
1. Remove `export const preferredRegion` from `web/app/api/leads/route.ts` and `web/app/api/etfs/route.ts`.
2. `CONSENT_VERSION = "cz-2026-10-28-v2"`. `LeadRequestSchema` and `LeadRecord` follow it, and v1 → 422 `invalid_consent_version`.
3. Add `LEAD_TTL_SECONDS = 63072000` to `config.ts`. The Upstash store writes `SET … NX EX LEAD_TTL_SECONDS`, and the memory driver may ignore it.
4. F1: there is no code change beyond `bffb227`. §7.2 now lists `quotes.index`/`registration` as optional and requires extra quote keys to be preserved.

### tests
1. Route exports: assert `preferredRegion` is **absent** (replaces `toBe("fra1")` in `tests/api/etfs.test.ts` and `tests/api/leads.test.ts`). Assert `web/vercel.json` `regions` equals `["fra1"]` and `LEAD_TTL_SECONDS === 63072000`.
2. Consent version `cz-2026-10-28-v2` in every valid payload. The v1 string now returns 422 `invalid_consent_version`. The consent label text ends "Souhlas mohu kdykoli odvolat."
3. Hero (`hero.spec.ts`): `/b` H1, sub and CTA label per web item 1. `hero-cta` on `/b` → `priips-note` in viewport (not `calc`); on `/` → `calc-diff` fully in viewport.
4. String updates:
   - calc footnote (web 6)
   - `calc-unlock` locked and no-twin texts (web 4, 5)
   - PRIIPs CTA text "Odemknout evropské alternativy"
   - thank-you heading "Hotovo. Tady jsou evropské alternativy."
   - TER notes "TER podle prospektu (staženo" / "TER (stav k" (`content.spec.ts`)
   - VOO size "1 000 mld. USD"
5. Unlocked state: `calc-ucits-fee-IE000XZSV718` "2 991 Kč", `calc-ucits-fee-IE00B5BMR087` "6 954 Kč" and `calc-ucits-diff` "3 962 Kč" at the defaults, plus the other two §6.2 UCITS fixtures. `thank-you-fees` = "Poplatek fondu za 20 let při 500 000 Kč: SPYL 2 991 Kč, CSPX 6 954 Kč (rozdíl 3 962 Kč)." and `thank-you-intro` contains "(index S&P 500)".
6. Analytics:
   - `value_view` and `form_view` are in the full-flow event set, once each
   - new `/b` test: no calculator touch → `value_view` (`source: "priips"`), `form_view`, `form_start`, `form_submit`, `lead_success`, no `calc_result`
   - `source_click` carries `link`
7. `sticky-cta` is hidden while `calc-unlock-cta` is in the viewport.
8. `/soukromi` contains "omezení zpracování", "námitku", "Předávání mimo EU", "Data Privacy Framework", "standardní smluvní doložky", "čl. 6 odst. 1 písm. f) GDPR" and "6 měsících".
9. Data schema: `ucits[].quotes.index` and `registration` are optional known keys, and `GET /api/etfs` must equal the file (already so after F1).
