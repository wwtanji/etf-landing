# Legal review brief: lead form consent

Status: **open. Paid ads must not start until counsel signs off.** This document lists facts about the current implementation and questions for counsel. It is not a legal opinion; having a privacy notice does not by itself make the mechanics compliant.

## 1. What the visitor sees and does (as built, consent version `cz-2026-10-28-v2`)
- Form text: "Odemkněte přehled evropských (UCITS) alternativ: ISIN pro vyhledání u brokera, TER a zdroj. Ukážeme ho hned tady na stránce."
- Fields: email, plus one required checkbox, **unchecked by default**:
  "Souhlasím se zasíláním e-mailů o poplatcích ETF a novinkách (nejvýše 1× měsíčně) a se zpracováním e-mailu podle zásad ochrany osobních údajů. Souhlas mohu kdykoli odvolat."
- Microcopy under the button: "Žádný spam. Odhlásit se můžete kdykoli."
- FAQ: "Výměnou za přehled evropských alternativ vám budeme posílat novinky o poplatcích ETF, nejvýše 1× měsíčně. Souhlas můžete kdykoli odvolat."
- **The unlock requires the checkbox.** Without it the form shows "Pro odemčení potřebujeme váš souhlas." (plan §5.4).
- Stored per lead: normalised email, `consent: true`, consent text version, timestamp, page variant, UTM parameters. No IP or user agent is stored. Records expire 24 months after consent (plan §8.4).
- Single opt-in. The system sends no email at launch (plan §12).
- The "gated" list is public data that is also in the static HTML and `GET /api/etfs` (plan §12, "the gate is cosmetic").

## 2. Legal basis stated in the privacy notice (`/soukromi`, plan §5.8)
- Newsletter: consent, Art. 6(1)(a) GDPR.
- Rate limiting by IP: legitimate interest, Art. 6(1)(f) GDPR.
- Analytics (Umami, cookieless): loaded only after a separate opt-in.
- Processors: Vercel, Upstash and Umami, with transfer bases as stated in plan §5.8. Upstash's live listing on the Data Privacy Framework site was not confirmed (plan §15 Q10).

## 3. Questions for counsel
1. **Conditional consent (GDPR Art. 7(4)).** Art. 7(4) says that when assessing whether consent is freely given, "utmost account shall be taken of whether, inter alia, the performance of a contract, including the provision of a service, is conditional on consent to the processing of personal data that is not necessary for the performance of that contract" (https://eur-lex.europa.eu/eli/reg/2016/679/oj). Is "the list unlocks only with newsletter consent" acceptable here, given that the list is free public data and the page is reachable without consent?
2. **Wording.** Does one checkbox validly cover both (a) sending marketing emails and (b) processing the email address? Is "o poplatcích ETF a novinkách" specific enough about the content of the emails?
3. **Withdrawal path (Art. 7(3): withdrawing must be as easy as giving consent).** Today the only way to withdraw is to write to the contact email, which is still empty (blocker B1). There is no unsubscribe link or endpoint, because no email is sent yet. Is that enough until the first send, or is a self-service withdrawal needed at launch?
4. **Czech commercial-communications rules.** Are the consent and the planned first email compliant with the Czech rules on electronic commercial communications, and is double opt-in required before the first send (plan §15 Q4)?
5. **Analytics.** Is opt-in required for cookieless Umami, or may it run without consent (plan §15 Q3)? The current build is opt-in.
6. **Financial-promotion wording.** Is the risk disclaimer and the "educational comparison, not advice" framing sufficient for a page that names specific US and UCITS ETFs?

## 4. Fallback ready to implement if counsel rejects 3.1 (plan §15 Q5, option b)
- The checkbox becomes optional; the unlock needs the email only.
- Only leads with `consent: true` are ever mailed; leads without consent are stored only if counsel approves a basis, otherwise not stored.
- New consent text and version; `consent` becomes a boolean in the API contract (§8.2); the success metric splits into "unlocks" and "mailable leads" (§14).
- This needs an architect plan change before the api, web and tests agents change code.

## 5. Sign-off
| Item | Counsel decision | Date |
|---|---|---|
| 3.1 Conditional consent | | |
| 3.2 Wording | | |
| 3.3 Withdrawal path | | |
| 3.4 Czech commercial-communications rules / double opt-in | | |
| 3.5 Analytics consent | | |
| 3.6 Disclaimer | | |
