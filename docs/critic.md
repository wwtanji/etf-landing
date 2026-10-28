# Critic findings: Task B landing page

Stage 3, 2026-10-28. The question: **could we launch ads on this page tomorrow?**

**How this was checked.** `web/` built with `npm run build` (Next.js 16.4.3, all routes `○` static except `/api/leads`) and served with `STORAGE_DRIVER=memory next start`. Playwright Chromium at 360×740 (`isMobile`, touch) went through `/?utm_…=ad_a_fees`, `/b?utm_…=ad_b_access` and `/soukromi`: consent bar (accept and reject), hero CTA, calculator chip, sticky CTA while scrolling in 700 px steps, the locked calculator row, the PRIIPs block, form errors (no consent, invalid email), submit, the thank-you state, copying an ISIN, and a reload after unlock. I looked at every screenshot. Events were read from `window.__lpEvents`. Issuer source pages were fetched on 2026-10-28. No console errors or page errors came up during the runs.

---

## Blockers

### User-side: code cannot fix these

**B1. Operator identity is empty** (owner: **user**)
- **What:** The footer "Provozovatel" and `/soukromi` sections "1. Správce" and "7. Kontakt" show the placeholder "Údaje provozovatele doplníme před spuštěním". Visitors get no controller and no contact address, so they cannot exercise the rights the page promises ("Souhlas můžu kdykoli odvolat", "Odhlásit se můžete kdykoli").
- **Where:** `web/lib/site-config.ts` (all four fields are `""`).
- **Evidence:** Rendered footer text: "PROVOZOVATEL | Údaje provozovatele doplníme před spuštěním". The `/soukromi` body shows the same text twice. Plan §15 Q1 ⛔.
- **Fix:** The user supplies the legal name, IČO, address and contact email. The production build already refuses to run without them (plan §5.7).

**B2. Vercel Hobby is non-commercial** (owner: **user**)
- **What:** Paid ads are commercial use.
- **Evidence:** Plan §12 quotes Vercel's docs: "Hobby plan restricts users to non-commercial, personal use only". Plan §15 Q2 ⛔.
- **Fix:** Approve Pro for the production project.

**B3. Umami website ID is not provisioned, so no funnel event leaves the browser** (owner: **user**)
- **What:** With `NEXT_PUBLIC_UMAMI_WEBSITE_ID` empty, events only go to `window.__lpEvents`. The brief's "track the full funnel" requirement would yield zero analytics data in production. Only the server-side lead counter would exist.
- **Evidence:** After `consent-accept`, no `<script>` with umami/`script.js` was present (`umami script tags:` empty). `web/.env.example`: `NEXT_PUBLIC_UMAMI_WEBSITE_ID=     # empty = events are only mirrored to window.__lpEvents`.
- **Fix:** Create the Umami Cloud site, then set `NEXT_PUBLIC_UMAMI_WEBSITE_ID` and `NEXT_PUBLIC_UMAMI_DOMAINS` in Vercel production env. Build the funnel report from §9.4 after M1 is resolved.

**B4. Production lead storage is not shown to be provisioned** (owner: **user**) `[INFERENCE: not verifiable from the repo]`
- **What:** `UPSTASH_REDIS_REST_URL/TOKEN` are empty in `.env.example`. Per decisions.md, the memory driver is refused on `VERCEL_ENV=production` and a misconfigured driver returns 500. Without Redis, every real submit would show "Něco se pokazilo".
- **Fix:** Connect Upstash (EU, Frankfurt) through the Vercel Marketplace, then do one real submit on the production URL before the ads go live.

### Code-fixable blockers
None found. Every flow works end to end on the memory driver: `consent_missing` and `invalid_email` show the right Czech errors, the submit flips to the thank-you state, `lp_unlocked` survives a reload, and the copy-ISIN action fires `value_interact`.

---

## Major

**M1. Funnel step 2 (`calc_result`) drops converters who never touch the calculator** (owner: **architect**, then **web**)
- **What:** Per §9.4, `calc_result` fires only "1000 ms after the last calculator change". The calculator shows a default result on load, by design, so a visitor can get the value and convert without changing anything. The Umami funnel `lp_view → calc_result → section_view(form) → form_start → form_submit → lead_success` then drops that lead at step 2, which corrupts conversion-by-step per variant.
- **Evidence:** A `/b` run that clicked the unlock CTA and submitted, without touching the calculator, recorded: `lp_view scroll_depth section_view:calc form_start section_view:priips section_view:form form_error:invalid_email form_submit lead_success`. There is no `calc_result`, but there is a `lead_success`.
- **Fix:** Use `section_view` (`section=calc`) as funnel step 2, and keep `calc_result` as a side metric. Alternatively, fire one `calc_result` with `default: true` the first time the calc section is viewed. Update plan §9.4 and the README funnel description.

**M2. Meta gets no conversion signal, so the campaign cannot optimise for or report leads** (owner: **user** decision, then **architect**)
- **What:** There is no Meta Pixel or Conversions API (decisions.md, plan §15 Q6). Ads Manager can only optimise for clicks or landing page views. Cost per lead per ad variant then has to be joined by hand from the Upstash `stats:leads:<variant>:<date>` counters. Plan §9.4 names Meta "landing page views" as the arrivals ground truth. `[INFERENCE: Meta measures website landing page views via its pixel. Meta's help page says LPV optimisation became "available for advertisers with pixel sharing challenges" from July 2025 (https://www.facebook.com/business/help/417293491972212). Check in Ads Manager whether LPV reports without a pixel.]`
- **Fix:** Either (a) launch on a Traffic/LPV objective knowingly and add a daily leads-per-variant readout from Redis, or (b) add a pixel or CAPI `Lead` event, consent-gated and sent only after analytics consent. Option (b) needs a plan change.

**M3. Variant A's "aha" is about funds the visitor can't buy, and the gated offer is thin** (owner: **architect**)
- **What:** The default calculator compares SPY with SPYM. One section later the page says "Háček: v Česku je většinou nekoupíte." The fee comparison that matters to a Czech buyer is SPYL 0,03 % vs CSPX 0,07 % (same index, 2.3×). It is locked behind email plus newsletter consent, and it does not appear in the calculator even after unlock. The gated payload is 5 UCITS rows, only 2 of them for the S&P 500. ISINs and TERs for the same funds are freely searchable (e.g. justETF). A sceptical intermediate visitor may well feel the offer is not worth a marketing opt-in. That risk compounds M6.
- **Evidence:** Rendered calc: "SPY · 0,0945 % · 9 366 Kč | SPYM · 0,02 % · 1 996 Kč | ROZDÍL ZA 20 LET: 7 369 Kč". `priips-note`: "Americká ETF ho zpravidla nemají, a proto vám je evropský broker obvykle neprodá." Thank-you: 2 S&P 500 cards (SPYL, CSPX) plus "DALŠÍ INDEXY" (SPYI, EIMI, IUAA).
- **Fix (pick one, then A/B test):**
  - After unlock, let the calculator compare the UCITS twins too: "SPYL vs CSPX: rozdíl X Kč".
  - Or make the gated value harder to get elsewhere: show KID availability with the issuer's Czech-registration quote per fund (SPYL's page lists "Czech Republic"), and add the twin's fee difference in Kč.
  - In both cases keep the A-hero promise unchanged.

**M4. Variant B's hero CTA sends the visitor to the wrong section** (owner: **architect**, since the plan fixes the section order for both variants)
- **What:** Ad B promises "Ukážeme vám evropská ETF se stejným indexem". On `/b`, the hero CTA "Porovnat ETF" scrolls to the fee calculator (`calc` at y=438, 1 090 px tall). The PRIIPs explanation starts at y=1 529 and the form at y=2 174. On a 740 px screen, the visitor scrolls about three screens of the variant-A tool to reach the variant-B promise.
- **Evidence:** Section offsets measured at 360×740: `hero 0`, `calc 438 (h 1090)`, `priips-note 1529`, `lead-form 2174`. Screenshot `b_after_cta`: inputs and chips, nothing about European ETFs.
- **Fix:** On `/b`, point `hero-cta` at `priips-note`, which leads into the form, and relabel it e.g. "Ukázat evropská ETF". Alternatively, render `priips-note` before `calc` on `/b` only. Log the deviation from plan §4 ("differ only in the hero copy").

**M5. Privacy notice gaps (GDPR Art. 13)** (owner: **architect** for the copy, **user** for legal sign-off)
- **What:**
  - The notice has no information on transfers to third countries. Vercel is a US company and Umami Cloud's hosting location is not stated. `[INFERENCE: Vercel Inc. is US-based. Umami Cloud's hosting region was not verified.]`
  - The rights list omits restriction (Art. 18) and objection (Art. 21).
  - The retention rule "nejdéle 24 měsíců od posledního e-mailu, který vám pošleme" has no end date if no email is ever sent. No email is sent at launch.
- **Evidence:** The `/soukromi` text "6. Vaše práva: … přístup k údajům, jejich opravu a výmaz, … odvolat, … přenositelnost … stížnost" has no restriction or objection. "4. Zpracovatelé" lists Vercel, Upstash and Umami Cloud with no transfer basis.
- **Fix:** Add a "Předávání mimo EU" paragraph (EU-US Data Privacy Framework or SCCs, per processor). Add the Art. 18 and Art. 21 rights. Change retention to "…nejdéle 24 měsíců od udělení souhlasu nebo od posledního e-mailu, podle toho, co nastane později".

**M6. Unlock is conditional on marketing consent: GDPR Art. 7(4) risk** (owner: **user**, legal review, plan §15 Q5)
- **Status:** Still open. The trade is stated openly, which is good. Rendered consent: "Souhlasím se zasíláním e-mailů o poplatcích ETF a novinkách (nejvýše 1× měsíčně) a se zpracováním e-mailu podle zásad ochrany osobních údajů. Souhlas můžu kdykoli odvolat." The checkbox is unchecked by default (`isChecked() === false`). Submitting without it shows "Pro odemčení potřebujeme váš souhlas."
- **Why it is major and not a blocker:** The plan did not mark it ⛔. A regulator could still view "no consent, no list" as consent that was not freely given.
- **Fallback the user can choose without a redesign:** Make the checkbox optional and unlock on email alone. Leads without consent can then never be mailed, so the number of mailable leads becomes the metric.

---

## Minor

**m1. Czech copy: stiff, translated or inconsistent phrases** (owner: **web** for rendered strings, **architect** where plan/ads.md fix the text)

| Where | On the page | Problem | Better Czech |
|---|---|---|---|
| Thank-you personal line | "Porovnávali jste SPY a SPYM (S&P 500 Index)." | English index name inside a Czech sentence (plan §13 example says "index S&P 500") | "Porovnávali jste SPY a SPYM (index S&P 500)." |
| UCITS card badge | "stejný index jako SPY, SPYM" | Comma list where Czech needs a conjunction | "stejný index jako SPY a SPYM" |
| Table / cards, iShares rows | "TER dle prospektu, staženo 28. 10. 2026" | "dle" is officialese | "TER podle prospektu (staženo 28. 10. 2026)" |
| Calculator footnote | "Výpočet: poplatek = částka × (1 − (1 − TER)^roky)." | Code notation (`^roky`) in consumer copy | "Počítáme jen poplatek fondu: každý rok si fond strhne TER z hodnoty investice. Zhodnocení nepočítáme." (keep the formula in a `title` or FAQ) |
| Table, VOO | "1,0 bil. USD" | "bil." is easy to misread as the English "billion" | "1 000 mld. USD" |
| Consent label | "Souhlas můžu kdykoli odvolat." | Colloquial "můžu" in a legal statement | "Souhlas mohu kdykoli odvolat." (changing it needs a new `consent_version`) |
| B H1 | "Proč u brokera nenajdete VOO – a co sleduje stejný index" | "co sleduje" is vague, and the ad says "která ETF" | "Proč u brokera nenajdete VOO – a která ETF sledují stejný index" |
| Form / PRIIPs | "evropských (UCITS) protějšků", "Odemknout evropské protějšky" | "protějšek" reads like a translation of "counterpart" | "evropské alternativy" ("Odemknout evropské alternativy") |
| Table size scope | "ETF třída akcií" / "celý fond" | Jargon without explanation, and VOO is the only one marked differently | "jen ETF třída (Vanguard)" or a one-line FAQ entry |

Overall the copy reads as written by a person. "Háček: v Česku je většinou nekoupíte.", "Smíme měřit, jak se stránka používá?" and "Na co se lidé ptají" are natural. There is no hype and no "kupte", "nejlepší" or "doporučujeme": a rendered-text grep on `/`, `/b` and `/soukromi` finds "doporučení" only in "ne investiční doporučení" and the FAQ.

**m2. After the hero CTA, the Kč difference is below the fold** (owner: **web**)
- **Evidence:** Screenshot `a_calc` (after tapping "Spočítat moje poplatky"): the inputs, the chips and the SPY/SPYM rows are visible. "ROZDÍL ZA 20 LET: 7 369 Kč", the number the ad promised, needs another swipe.
- **Fix:** Scroll to the result card. Alternatively, on mobile, show the result card above the controls.

**m3. The sticky CTA stacks directly under the calculator's own unlock CTA** (owner: **web**)
- **Evidence:** Screenshot `s_01` (y=700): "Odemknout zdarma" (calc-unlock) and the sticky "Odemknout evropské protějšky" are visible at the same time, with the sticky bar overlapping the bottom edge of the unlock card.
- **Fix:** Also hide `sticky-cta` while `calc-unlock` is in view. It already hides for the PRIIPs CTA (sticky=false at y=1400).

**m4. B hero states the KID claim as absolute** (owner: **architect**, since the wording comes from `docs/ads.md`)
- **Evidence:** The `/b` sub says "Americká ETF nemají dokument KID, který EU vyžaduje pro drobné investory." The ads.md wording rule says the page uses "zpravidla / obvykle" and never claims it is absolutely impossible.
- **Fix:** "Americká ETF zpravidla nemají dokument KID…" (in the ad text too).

**m5. The gate is cosmetic** (owner: **architect**: accept and document, or move the data server-side)
- **Evidence:** The static HTML of `/` contains `IE00B5BMR087`/`CSPX` before unlock, and `GET /api/etfs` returns all `ucits[]` rows.
- **Impact:** Fine for normal visitors. It matters only if the "exclusive list" is ever marketed as exclusive.

**m6. Data labels worth tightening** (owner: **architect**)
- **State Street TER date:** The SSGA "TER k 28. 10. 2026" is the page's "Fund Information as of" date, not the date the TER took effect. A better label is "TER (stav k 28. 10. 2026)".
- **CSPX fund size:** It is labelled "třída akcií", but the source only says "Net Assets as of 27/Oct/2026 USD 156,574,731,148". The same page also shows "Net Assets of Fund … 159,762,891,072". This scope is the plan's own `[INFERENCE]`.
- **VOO and other Vanguard rows:** The link target (`/profile/voo`) does not contain the figures in its HTML, and a headless render returned an empty body. The figures come from `evidence_urls` (`/vmf/api/VOO/profile`, `/characteristic`), which the page does not link.

**m7. Promises that need the email stack** (owner: **user**, plan §15 Q4)
- "Žádný spam. Odhlásit se můžete kdykoli." and "Až se poplatky těchto ETF změní, dáme vám vědět e-mailem." depend on things that do not exist yet: no ESP, no unsubscribe link, no DOI. This is acceptable only because no email is sent at launch. The first send must wait for DOI and an unsubscribe link.

**m8. The consent bar covers the calculator "peek" on the first screen** (owner: **web**, accept)
- **Evidence:** Screenshot `a_fold`: the 87 px bar (≤ 88 px per §9.3) sits over the "500 000 Kč" input. The hero CTA (y 295–347) stays clear.
- Acceptable. Mentioned only because the plan wants the calculator to peek in.

**m9. Lighthouse and real-phone checks not run** (owner: **user**/main, plan §11 items 4, 5, 7). Status: still open.

---

## Checklist against the role file

| Check | Result |
|---|---|
| Ad-to-page match, A | **Pass.** Ad headline "Stejný index, 4,7× jiný poplatek" → H1 "Stejný index S&P 500. Poplatek až 4,7× vyšší." (4,7 = ⌊0,0945/0,02⌋₁ from data). Ad "přes 7 000 Kč" → default result "7 369 Kč". Ad "Data přímo od emitentů" → eyebrow "data od emitentů, stažena 28. 10. 2026". The page `<title>` matches too. |
| Ad-to-page match, B | **Partial.** H1 "Proč u brokera nenajdete VOO – a co sleduje stejný index" repeats the ad headline (the VOO "search field" visual is a nice touch). The second half of the promise sits ~1 700 px down behind the calculator (M4) and the email gate (M3, M6). |
| Value before form | **Pass.** Hero, ratio and trust line are fully above the fold at 360×740. A default Kč result renders without input. The form starts at y=2 174, after the calculator and PRIIPs. Weakness: the value is about funds the visitor cannot buy (M3). |
| Offer worth an email | **Doubtful** (M3). Five public ISIN/TER rows in exchange for a monthly newsletter opt-in. |
| Form friction | **Good.** One field plus one unchecked checkbox. Submit "Odemknout přehled". Clear errors with `role=alert`. The CTA does not auto-focus. The thank-you state replaces the form in place, scrolls into view, and survives a reload. |
| Czech copy | Mostly native. 9 fixes in m1. |
| Not-default-AI | **Pass, with a caveat.** It reads as deliberately designed: cream and ink palette, serif display face, a receipt-style result with dotted leaders, a hand-circled "4,7×", VOO in a dashed "search box" on `/b`, and no stock imagery or gradients. Caveat: the "01 —— KALKULAČKA POPLATKŮ" numbered mono eyebrows are a common template pattern. |
| Measurement | **Wired, but not live and step 2 is flawed.** All §9.4 events were observed in-page: `lp_view`, `scroll_depth`, `section_view` (calc/priips/form), `calc_interact`, `calc_result`, `cta_click` (hero/calc_unlock), `form_start`, `form_error` (consent_missing/invalid_email), `form_submit`, `lead_success`, `value_interact`. Every event carries `variant` and UTMs. Before consent nothing is sent (`__lpEvents` was null). After reject, nothing is sent. Gaps: B3 (no Umami ID), M1 (funnel step), M2 (no Meta signal). Coverage is consented sessions only, by design (§9.4). |
| No buy/best, no return promise | **Pass.** Grep above. The calculator says "Ilustrace nákladů, ne předpověď výnosu." |
| Risk disclaimer | **Pass.** Footer `risk-disclaimer`, verbatim from §5.7, visible without interaction. |
| Consent unchecked | **Pass.** `lead-consent` defaults to false. The API rejects `consent:false` (`{"ok":false,"error":"validation_failed","fields":{"consent":"consent_required"}}`). |
| PRIIPs note | **Pass.** `priips-note` sits before the form, uses "zpravidla"/"obvykle", and cites EP question E-004745/2021. Exception: the B hero (m4). |
| Privacy reachable | **Pass** from the form label link, the footer `privacy-link` and the consent bar "Více". Content gaps: B1, M5. |
| Art. 7(4) bundling | **Open risk** (M6). |

---

## Data truthfulness: spot-checks (8 funds, 19 figures, fetched 2026-10-28)

"Page" is the rendered text on `/` or the thank-you state at 360 px. "Source" is the issuer page fetched by me (HTML text, or Vanguard's JSON endpoint where noted).

| # | Fund (issuer, type) | Figure | On page | At source | Result |
|---|---|---|---|---|---|
| 1 | SPY (State Street, US) | TER | 0,0945 % (TER k 28. 10. 2026) | "Gross Expense Ratio … 0.0945%", "Fund Information as of Oct 28 2026" ([ssga.com SPY](https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-500-etf-trust-spy)) | match |
| 2 | SPY | Fund size | 814,8 mld. USD, celý fond, Data k 27. 10. 2026 | "Assets Under Management $814,816.36 M as of Oct 27 2026" | match |
| 3 | SPYM (State Street, US) | TER | 0,02 % | "…most recent prospectus. 0.02%" ([ssga.com SPYM](https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-portfolio-sp-500-etf-spym)) | match |
| 4 | SPYM | Fund size | 185,0 mld. USD, Data k 27. 10. 2026 | "Assets Under Management $185,006.72 M as of Oct 27 2026" | match |
| 5 | IVV (iShares, US) | TER | 0,03 % (dle prospektu, staženo 28. 10. 2026) | "Expense Ratio: Fees as stated in the prospectus 0.03%" ([ishares.com IVV](https://www.ishares.com/us/products/239726/ishares-core-s-p-500-etf)) | match |
| 6 | IVV | Fund size | 885,1 mld. USD, Data k 27. 10. 2026 | "Net Assets of Fund $885,141,071,461 as of Oct 27, 2026" | match |
| 7 | IEMG (iShares, US) | TER / size | 0,09 % / 150,4 mld. USD | "Expense Ratio: Fees as stated in the prospectus 0.09%" / "Net Assets of Fund $150,391,423,628 as of Oct 27, 2026" ([ishares.com IEMG](https://www.ishares.com/us/products/244050/ishares-core-msci-emerging-markets-etf)) | match |
| 8 | VOO (Vanguard, US) | TER | 0,03 % (TER k 28. 4. 2026) | `"expenseRatio":"0.0300","expenseRatioAsOfDate":"2026-04-28…"` ([vmf/api/VOO/profile](https://investor.vanguard.com/vmf/api/VOO/profile)). The cited `source_url` HTML does not contain it (m6). | match |
| 9 | VOO | Fund size | 1,0 bil. USD, ETF třída akcií, Data k 30. 9. 2026 | `"shareClassTotalNetAssets":"$1.0 trillion","shareClassTotalNetAssetsDate":"2026-09-30…"` ([vmf/api/VOO/characteristic](https://investor.vanguard.com/vmf/api/VOO/characteristic)) | match (rounded as published; 4 weeks old, dated) |
| 10 | SPYL (State Street, **UCITS**) | TER | 0,03 % (TER k 28. 10. 2026) | "TER 0,03%", "Fund Information as of 28 Oct 2026" ([ssga.com SPYL](https://www.ssga.com/cz/en_gb/institutional/etfs/state-street-spdr-sp-500-ucits-etf-acc-spyl-gy)) | match |
| 11 | SPYL | Size / ISIN | 19,7 mld. USD, třída akcií, Data k 27. 10. 2026 / IE000XZSV718 | "Share Class Assets $19 701,24 M", "Fund Net Asset Value as of 27 Oct 2026" / "ISIN IE000XZSV718". Also "Countries of Registration Austria, Czech Republic, …" | match |
| 12 | CSPX (iShares, **UCITS**) | TER | 0,07 % | "Total Expense Ratio 0.07%" ([ishares.com CSPX](https://www.ishares.com/uk/individual/en/products/253743/ishares-sp-500-b-ucits-etf-acc-fund)) | match |
| 13 | CSPX | Size / ISIN | 156,6 mld. USD, třída akcií, Data k 27. 10. 2026 / IE00B5BMR087 | "Net Assets as of 27/Oct/2026 USD 156,574,731,148" (fund total 159,762,891,072) / "ISIN IE00B5BMR087" | match (scope label inferred, m6) |
| 14 | EIMI (iShares, **UCITS**) | TER / size / ISIN | 0,18 % / 42,2 mld. USD / IE00BKM4GZ66 | "Total Expense Ratio 0.18%" / "Net Assets as of 27/Oct/2026 USD 42,153,956,578" / "ISIN IE00BKM4GZ66" ([ishares.com EIMI](https://www.ishares.com/uk/individual/en/products/264659/ishares-msci-emerging-markets-imi-ucits-etf)) | match |

**Derived figures:**
- Hero ratio: 0,0945 / 0,02 = 4,725 → "4,7×" (floored). Correct.
- Calculator: 500 000 × (1 − 0,999055²⁰) = 9 365,6 Kč, and 500 000 × (1 − 0,9998²⁰) = 1 996,2 Kč. Difference 7 369 Kč, which matches the page. At 1 000 000 Kč the page shows 18 731 / 3 992 / 14 739 Kč, exactly double. Correct.

**Result:** 19 of 19 figures match the live issuer data. Every figure on the page carries a source link and a date, and none is invented. The only staleness is Vanguard's own publishing cadence (AUM as of 30. 9., TER as of 28. 4.), and the page labels it.

---

## Verdict: **not yet**

No code defect blocks launch. The page works, the data is true, and the compliance basics are in place. Ads cannot run tomorrow because of the user-side blockers:
- **B1:** operator identity
- **B2:** Vercel Pro
- **B3:** Umami ID
- **B4:** production Redis

Without B3 and M1/M2 fixed, the spend would also produce funnel numbers you can't use.

**Counts:** 4 blockers (all user-side, 0 code-fixable), 6 major, 9 minor.

**Top 3 fixes:**
1. **User:** fill `site-config` operator data, move to Vercel Pro, connect Upstash, and set the Umami website ID. Then do one real submit on the production URL (B1–B4).
2. **Architect → web:** fix measurement before spending. Make funnel step 2 `section_view(calc)` (or a default `calc_result`), and decide on a Meta conversion signal or a Redis-based leads-per-variant readout (M1, M2).
3. **Architect → web:** make variant B deliver its promise. Point the `/b` hero CTA at the PRIIPs block and the form (M4). Show the UCITS twin fee comparison in the calculator after unlock, so the "aha" is about funds the visitor can actually buy (M3).
