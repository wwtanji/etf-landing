# Clientelo ETF landing page (Task B)

A mobile-first Czech lead-magnet landing page for retail investors (25–45) who arrive from a Meta ad. The page shows value first: a fee calculator that turns the annual fee (TER) into Kč for the visitor's amount and horizon, comparing NYSE Arca ETFs that track the same index; a sourced comparison table of 11 NYSE Arca ETFs; and an honest note on why Czech retail investors generally cannot buy US ETFs (PRIIPs/KID). In exchange for an email plus newsletter consent, the page unlocks "Evropské alternativy": European UCITS ETFs that track the same or a similar index, with ISIN, TER, fund size, source and date, delivered right on the page. Two ad variants map to two routes: `/` (A, "Fees") and `/b` (B, "Access"). Stack: Next.js 16.4 (one app in `web/`, API routes included), Upstash Redis, and Umami Cloud loaded only after consent.

**Live URL:** Not deployed yet (see [Known gaps](#9-known-gaps)).

## 2. How to run (from a clean clone)

Requires Node.js and npm.

### Web app (`web/`)
```sh
cd web
npm ci
cp .env.example .env.local      # then set STORAGE_DRIVER=memory for local runs (no Redis needed)
npm run dev                      # next dev, http://localhost:3000 (/ and /b)
npm run build && npm run start   # production build + serve
```
Other scripts: `npm run lint`, `npm run typecheck`, `npm run format:check`.
All env variables are listed in `web/.env.example` (plan §8.5). The memory driver is refused when `VERCEL_ENV=production`, and the production build fails while the operator identity in `site-config` is empty (see B1).

### Tests (`tests/`)
```sh
cd tests
npm ci
npm test                      # vitest run (all: data, unit, api)
npm run test:data             # or test:unit / test:api
npx playwright install
npm run test:e2e              # playwright test (360×740, builds and starts the web app with STORAGE_DRIVER=memory)
```

## 3. Results

- **Automated tests** (docs/test-findings.md, run 2026-10-28 on commit `45befe1`, after critic fix round 1): Vitest **77/77**, Playwright **62/62**, `tsc` clean in `tests/`. Before round 1 (on `5ce2fa5`): Vitest 73/73, Playwright 57/57.
- **Data truthfulness:** the critic re-fetched issuer pages on 2026-10-28 and spot-checked 8 funds / 19 figures: **19 of 19 matched** (docs/critic.md). The hero ratio "4,7×" and the default calculator result (7 369 Kč) were recomputed by hand and match.
- **Lighthouse:** not run yet.
- **Real-phone test:** not run yet.

## 4. Section order and why (plan §5)

Same order for both variants (360 px, mobile-first):

| # | Section | `data-testid` | Why here |
|---|---|---|---|
| 1 | Hero | `hero` | Continues the ad promise word for word, so the visitor knows in about 2 s they are in the right place. One CTA. |
| 2 | Fee calculator (default result visible) | `calc` | The value comes first. The visitor sees a Kč number before anything is asked. This is the "aha" that earns the ask. |
| 3 | "Háček": PRIIPs/KID explainer | `priips-note` | Honesty that also creates the need: you can't buy these, but equivalents exist. It turns curiosity into a reason to unlock. |
| 4 | Lead form ("Evropské alternativy") | `lead-form` | The ask comes at peak intent, right after value and need. Thank-you state replaces it in place. |
| 5 | Full NYSE ETF comparison table | `etf-table` | Proof and depth for skeptics, with sources and dates. After the ask so it does not push the ask down. Still free. |
| 6 | FAQ (4 items) | `faq` | Handles objections: "is this advice?", "why my email?", "where is the data from?", "what is TER?". |
| 7 | Footer: risk disclaimer, operator, privacy, analytics settings | `risk-disclaimer`, `privacy-link` | Required compliance content in a predictable place. |
| - | Sticky CTA | `sticky-cta` | Brings back visitors who scroll past the form. |
| - | Analytics consent bar | `consent-bar` | Must not block the content. |

Changes in round 1 (after the critic): the order itself is unchanged, but the variants now differ in the hero CTA target. On `/b`, `hero-cta` ("Ukázat evropská ETF") scrolls to `priips-note`, because ad B promises European ETFs, not the calculator (critic M4). On `/`, tapping `hero-cta` must bring `calc-diff` fully into view. `sticky-cta` also hides while `calc-unlock-cta` is visible. After unlock, the calculator shows the UCITS alternatives' fees in Kč (critic M3).

## 5. Expected conversion (plan §14.2)

Metric: `lead_success` ÷ landing-page views.

Sourced benchmarks (Unbounce, retrieved 2026-10-28):
- "investing is struggling to keep up, with a conversion rate of just 3.9%" — https://unbounce.com/conversion-benchmark-report/finance-insurance-conversion-rate/
- "the overall financial services median conversion rate of 8.3%" (same source)
- "Paid search (10.1%) and paid social (9.3%) are beating out email (7.9%)" (same source)
- "around 6.6% across all industries as of Q4 2024" — https://unbounce.com/average-conversion-rates-landing-pages

**Our estimate: about 4 % (plausible range 2.5–6 %). This is an assumption, not a measurement.**
- Base: the investing median, 3.9 %.
- Up: tight ad-to-hero message match, a single field, tangible gated value right after a personal Kč result.
- Down: cold Czech traffic, a required marketing-consent checkbox, and the analytics consent bar.

Assumed funnel (all assumptions, to compare with real data later):

| Step | Share of visits |
|---|---|
| `lp_view` | 100 % |
| `value_view` (calculator result or PRIIPs block seen) | 60 % |
| `form_view` | 35 % |
| `form_start` | 9 % |
| `form_submit` | 5 % |
| `lead_success` | 4 % |

Measurement caveat: Umami sees consented sessions only. Overall conversion = Upstash lead counter ÷ Meta landing-page views.

## 6. Three A/B hypotheses, ranked (plan §14.3)

Primary metric: `lead_success / lp_view` by `variant`; guardrail: `form_error` rate. Sample sizes: two-proportion z-test, α = 0.05 two-sided, power 0.8, 4 % baseline: **4 783** visits per arm for +30 % relative (4.0 → 5.2 %), **10 317** for +20 %, **17 943** for +15 %.

1. **Inline ask in the calculator result (highest).** Email, consent and button directly inside `calc-result` instead of a separate section after the PRIIPs block. Asks at peak intent and removes a mobile scroll step. Expected +20–30 % relative.
2. **Live proof in the hero (medium).** A mini result in the hero ("SPY vs SPYM, 500 000 Kč, 20 let: rozdíl 7 369 Kč") instead of text only. Value lands in the first screen and keeps message match with ad A. Expected +10–20 % on `calc_result` and downstream.
3. **Sticky CTA on vs off (lowest).** Recovers visitors who scroll past but adds UI noise. Expected ±5–10 %. Run only after 1 and 2.

## 7. Analytics funnel (plan §9.4, r1)

Umami funnel steps can only be page URLs or event names, with no property filter (https://docs.umami.is/docs/funnel), so the variant split is by URL. Two funnels, 60-minute window:

- **A:** Viewed page `/` → `value_view` → `form_view` → `form_start` → `form_submit` → `lead_success`
- **B:** Viewed page `/b` → `value_view` → `form_view` → `form_start` → `form_submit` → `lead_success`

`calc_result` and `section_view` are side metrics, not steps: a visitor can convert from the default result, or on `/b` from the PRIIPs block, without touching the calculator (critic M1). Lead ground truth: Upstash `stats:leads:<variant>:<date>` counters. Arrivals: Meta landing-page views (whether Meta reports them without a pixel is open, §15 Q6). [INFERENCE from the plan, unverified: Umami matches the URL step without the UTM query; check with one test session per route.] Full event list: plan §9.4.

## 8. Key decisions

Full log: [docs/decisions.md](docs/decisions.md).

1. Gated offer = list of European UCITS alternatives delivered on the page right after submit; calculator and US ETF table stay ungated (value first, no email infrastructure needed).
2. No ask above the fold, no modal or popup; first ask is a locked row inside the calculator result.
3. Calculator shows cost only, assuming 0 % return: amount × (1 − (1 − TER)ⁿ), so it cannot read as a forecast or advice.
4. Ad variants map to static routes (`/` = A, `/b` = B); UTMs only label traffic.
5. Real data only: 11 NYSE Arca ETFs + 5 UCITS alternatives, each figure with source and as-of date; rows without verifiable data were excluded rather than guessed (e.g. SCHD, Vanguard UCITS).
6. Email-only form with a mandatory, unchecked, versioned marketing consent (`cz-2026-10-28-v2`); duplicates return the same 200; honeypot; 5 POSTs per IP per 600 s; no IP or user agent stored; lead TTL 730 days.
7. Upstash Redis (EU, Frankfurt) for leads and rate limiting; `STORAGE_DRIVER=memory` for tests, refused in production.
8. Umami Cloud loaded only after opt-in; leads also counted server-side; no Meta Pixel/CAPI at launch (user decision, §15 Q6).
9. Operator identity is never invented: the production build fails while it is empty.

## 9. Known gaps

**User-side blockers (critic B1–B4), launch verdict "not yet":**
- **B1** Operator identity (legal name, IČO, address, contact email) is empty; footer and `/soukromi` show gap text (§15 Q1).
- **B2** Vercel Hobby is non-commercial only; production needs Pro or another arrangement (§15 Q2).
- **B3** Umami Cloud site (EU data region) not created; no funnel event leaves the browser until `NEXT_PUBLIC_UMAMI_WEBSITE_ID`/`NEXT_PUBLIC_UMAMI_DOMAINS` are set (§15 Q8).
- **B4** Production Upstash Redis not connected; one real submit on the production URL still needed (§15 Q9).

**Other open questions (plan §15):** analytics consent stance (Q3); double opt-in and ESP before any marketing email (Q4); legal review of "unlock in exchange for newsletter consent", GDPR Art. 7(4) (Q5); Meta conversion signal (Q6); Meta ad review for financial products in CZ (Q7); privacy notice sign-off incl. Upstash DPF listing (Q10); pre-launch measurements (Q11).

**Not run / unverified:** Lighthouse mobile and real-phone test not run; no deployment, so Vercel (`fra1` region, file tracing of `../data`), Upstash and Umami delivery are unverified. The reviewer stage (docs/review.md) has not run yet.

**Not covered by automated tests** (docs/test-findings.md): the Upstash driver against real Redis; the log-line content on a real store failure; the production-build guard for empty operator data; real Umami delivery and the funnel report; the `calc_result` 10-per-load cap beyond an upper bound; the ≥ 768 px table layout; copy-ISIN toast timing; static generation of `/` and `/b` beyond the build log.

## 10. How AI was used

**Instructions.** `CLAUDE.md` sets the workflow, code rules and deliverables. Six agent role files in `.claude/agents/` (architect, api, web, tests, critic, reviewer). `docs/pipeline.md` defines the stages: architect → api | web | tests in parallel → critic → reviewer → deploy. `docs/plan.md` is the single source of truth; every judgment call is one line in `docs/decisions.md`; each stage commits.

**How output was checked.**
- Tests written by the tests agent from the plan only, without reading the implementation.
- Critic agent: product review against the role checklist plus an independent data spot-check (19/19 figures matched the live issuer pages).
- Reviewer agent: code review stage (not run yet at the time of writing).
- Independent source spot-checks: the main session re-fetched the SPY figures from ssga.com.

**Where AI was wrong (from the repo docs):**
- **F1** (docs/test-findings.md): the api agent's Zod schema stripped `ucits[].quotes.index` from the served dataset, losing verbatim evidence on 3 UCITS rows. Root cause was partly the architect's own plan (§7.2 did not list the key). Fixed in `bffb227`.
- **F2** (docs/test-findings.md): the web agent's honeypot input lacked `aria-hidden="true"`, so screen readers could reach the trap field. Fixed in `5ce2fa5`.
- **The tests agent's own tests** (docs/test-findings.md): the first E2E run had 12 extra failures caused by the tests themselves (CSS-uppercased `innerText`, Umami stub not active in every test, a wrong expectation about the consent queue after deny→grant, requiring the literal "ÚOOÚ"). Fixed without loosening the contract.
- **Round 1 test bug** (docs/test-findings.md): the tests agent's first `/b` funnel test typed into the email field before `form_view` had registered, so `form_start` came before `form_view`. Fixed in the test; the order assertion is unchanged.
- **Critic M1** (docs/critic.md): the planned funnel step 2 (`calc_result`) would have dropped converters who never touch the calculator; replaced by `value_view` + `form_view` and URL-split funnels.
- **Critic M4**: the `/b` hero CTA sent variant-B visitors to the calculator instead of the European ETFs the ad promised.
- **Round 1 `/b` scroll** (docs/decisions.md): a smooth scroll from the `/b` hero CTA swept `calc-result` through the viewport, so `value_view` reported `source: "calc"` for visitors who never looked at the calculator. Switched to an instant jump.
- **Czech copy (critic m1)**: "protějšek" read as a translation of "counterpart" (→ "alternativa"); an English index noun inside a Czech sentence; "bil." reading as English "billion" (→ "mld. USD"); code notation (`^roky`) in consumer copy; informal register in the consent label.
- **Framework knowledge** (docs/decisions.md): the create-next-app 16.4 template enabled Cache Components, which made the planned `dynamic` route segment config a build error (removed); the plan's `preferredRegion` export is deprecated in Next.js 16.4 and was replaced with `web/vercel.json` `"regions": ["fra1"]`.

## 11. AI session log

Agent sessions are exported with `/export` into [`ai-log/`](ai-log/) (per docs/pipeline.md).
