# Ad variants (Task B)

Two mobile ad variants for Meta (Facebook/Instagram feed and Stories). Copy is Czech; notes are English.
Both drive cold traffic to the same page. Each variant lands on its own route so the hero continues that ad's promise. See `docs/plan.md` §4 and §5.

Every number in the ad copy comes from `data/etfs.json`. Each figure there has its issuer source URL, as-of date, and a verbatim quote:
- SPY TER **0.0945 %**: https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-500-etf-trust-spy. TER as of 2026-10-28, retrieved 2026-10-28. Quote: "Fund Information as of Oct 28 2026 … Gross Expense Ratio … It can be found in the fund's most recent prospectus. 0.0945% Base Currency USD".
- SPYM TER **0.02 %**: https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-portfolio-sp-500-etf-spym. TER as of 2026-10-28, retrieved 2026-10-28. Quote: "Fund Information as of Oct 28 2026 … Gross Expense Ratio … It can be found in the fund's most recent prospectus. 0.02% Base Currency USD".
- VOO and IVV, named in the hero sub: TERs and quotes are in `data/etfs.json` and plan §7.3.
- Ratio 0.0945 / 0.02 = 4.725. The ads round it down to **4,7×**.
- "přes 7 000 Kč" comes from the plan's fee formula (§6.2): fee = A × (1 − (1 − TER)^years) with A = 500 000 Kč and 20 years. SPY = 9 365.64 Kč, SPYM = 1 996.20 Kč, difference 7 369.44 Kč. The formula assumes 0 % growth and counts only fund costs (TER).

**If `data/etfs.json` is refreshed, re-check these numbers before the ads run again.** The page computes its hero ratio from the data. The ads are static text.

## Shared rules
- Educational angle only. Never say "kupte", never promise returns or "nejlepší ETF", and never use "you are an investor"-style personal-attribute phrasing.
- Primary text: the hook must fit in the first ~125 characters. [ASSUMPTION: this is common Meta truncation guidance. Check the real cut-off in the Ads Manager mobile preview.]
- Button: "Zjistit více" (Learn more). We do not use "Zaregistrovat se": the page gives value first and the email is optional.
- Format: 1:1 feed image and 9:16 Stories image. The visuals below are briefs for a designer. No stock "rocket/chart going up" imagery.
- UTM scheme. `utm_content` identifies the ad variant, and the route identifies the page variant:
  - Variant A → `https://<domain>/?utm_source=meta&utm_medium=paid_social&utm_campaign=etf_lp_2026q4&utm_content=ad_a_fees`
  - Variant B → `https://<domain>/b?utm_source=meta&utm_medium=paid_social&utm_campaign=etf_lp_2026q4&utm_content=ad_b_access`

---

## Variant A: "Fees" (loss aversion, concrete number)

**Angle:** Two funds track the same index and cost different amounts. The visitor can see the difference in Czech crowns for their own amount.
**Promise:** "Spočítejte si, kolik vás stojí poplatek u stejného indexu."
**Audience:** Czech adults on mobile who already know the word "ETF" or "S&P 500" (beginner-to-intermediate DIY investors).

| Field | Copy (cs) | Chars |
|---|---|---|
| Primary text | SPY a SPYM kopírují stejný index S&P 500. Roční poplatek? 0,0945 % vs. 0,02 %. U 500 000 Kč za 20 let je to rozdíl přes 7 000 Kč. Spočítejte si to pro svou částku. | 163 |
| Primary text (short alt) | Stejný index S&P 500, poplatek až 4,7× vyšší. Spočítejte si, kolik vás to stojí. | 80 |
| Headline | Stejný index, 4,7× jiný poplatek | 32 |
| Description | Data přímo od emitentů ETF | 26 |
| Button | Zjistit více | |

**Visual brief:** Two plain price tags side by side, both labelled "S&P 500". Left tag "0,0945 %", right tag "0,02 %". Small footer text: "TER dle emitentů, 28. 10. 2026". Calm palette, no arrows or charts.

**Lands on:** `/` (hero variant A).

**Hero continuation (variant A):**
- Eyebrow: `ETF z newyorské burzy NYSE Arca · data od emitentů, stažena 28. 10. 2026` (the date comes from the dataset's `retrieved_at`)
- H1: **Stejný index S&P 500. Poplatek až 4,7× vyšší.** (the ratio is computed from data. See plan §5.1.)
- Sub: Zadejte částku a za 30 vteřin uvidíte, kolik vás roční poplatek (TER) stojí u SPY, IVV, VOO a SPYM.
- Primary CTA: **Spočítat moje poplatky** (scrolls to the calculator)
- Trust line: Vzdělávací srovnání, ne investiční doporučení. Zdroje a data u každého čísla.

The H1 repeats the ad headline's "4,7×" and the same index name. The sub delivers the "spočítejte si" promise right away.

---

## Variant B: "Access" (curiosity + a real pain point)

**Angle:** Czech investors see US finfluencers recommend VOO/SPY, search for it at their EU broker and cannot buy it. We explain why (PRIIPs/KID) and show which European funds track the same index.
**Promise:** "Proč u brokera nenajdete VOO, a která evropská ETF sledují stejný index."
**Audience:** Same as A, plus people who have already tried to buy a US ETF.

| Field | Copy (cs) | Chars |
|---|---|---|
| Primary text | Hledali jste u brokera VOO nebo SPY a nenašli je? Americká ETF nemají dokument KID, který EU vyžaduje pro drobné investory. Ukážeme vám evropská ETF se stejným indexem. | 168 |
| Primary text (short alt) | Proč u evropského brokera nenajdete VOO a která ETF sledují stejný index. | 73 |
| Headline | Proč u brokera nenajdete VOO | 28 |
| Description | Srovnání poplatků a evropské protějšky | 38 |
| Button | Zjistit více | |

**Visual brief:** A phone screen showing a broker search field with "VOO" typed in and the empty result "Nenalezeno". Next to it, a small card: "S&P 500 · UCITS · ISIN IE…". No real broker logos or trademarks.

**Lands on:** `/b` (hero variant B).

**Hero continuation (variant B):**
- Eyebrow: `ETF z newyorské burzy NYSE Arca · data od emitentů, stažena 28. 10. 2026` (the date comes from the dataset's `retrieved_at`)
- H1: **Proč u brokera nenajdete VOO – a co sleduje stejný index**
- Sub: Americká ETF nemají dokument KID, který EU vyžaduje pro drobné investory. Porovnejte jejich poplatky a odemkněte evropské protějšky se stejným indexem.
- Primary CTA: **Porovnat ETF** (scrolls to the calculator)
- Trust line: Vzdělávací srovnání, ne investiční doporučení. Zdroje a data u každého čísla.

The H1 repeats the ad headline almost word for word. The sub delivers both halves of the promise: the reason (KID) and what to do next (the European counterparts).

**Claim support for "Americká ETF nemají dokument KID…":**
- European Parliament written question E-004745/2021 (a question by an MEP, not a legal act), https://www.europarl.europa.eu/doceo/document/E-9-2021-004745_EN.pdf, retrieved 2026-10-28 (footnote markers kept): "Since 2018, ordinary investors in the European Union cannot invest in US exchange-traded funds (US ETFs) 1. This is because rules 2 came into force in 2018 requiring providers of investment products to supply retail investors with a 'key information document' (KID) to help them better understand the product they are buying. US ETFs do not provide such a document."
- justETF, https://www.justetf.com/en/news/etf/us-domiciled-etfs.html, retrieved 2026-10-28: "If you already own a US-domiciled ETF then you can hold or sell it but you won't be able to buy more until a PRIIPs compatible KID becomes available."
- Wording rule: the page says "zpravidla / obvykle" (generally) and never claims it is absolutely impossible. [ASSUMPTION: some routes exist, e.g. professional-client status or non-EU brokers. We did not verify them and must not describe them on the page.]

---

## What we measure per variant
- Ad platform: impressions, CTR, cost per landing-page view.
- Page: `variant` and `utm_content` on every analytics event (plan §9). Leads are counted server-side per variant (plan §8.4).
- Success metric per variant: `lead_success / landing-page views` (cost per lead in Ads Manager). Secondary metric: `calc_result / lp_view`.
