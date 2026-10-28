# Test findings

Written by the tests agent from `docs/plan.md` / `docs/ads.md` only (implementation not read).
Each entry: test, expected per contract, actual, owner. Run commands: see `tests/package.json`.

## Open

### F2. Honeypot input lacks `aria-hidden="true"` (owner: web)
- Test: `tests/e2e/form.spec.ts` › "fields, consent default and honeypot follow the contract" (Playwright, 360×740, `next build && next start`, `STORAGE_DRIVER=memory`).
- Expected: §5.4 "Honeypot `lead-website`: input `name="website"` … with `tabindex="-1"`, `autocomplete="off"` and `aria-hidden="true"`."
- Actual: `<input value="" type="text" tabindex="-1" name="website" autocomplete="off" data-testid="lead-website"/>`, no `aria-hidden` attribute, so screen readers can still reach the trap field. The later assertions in the same test (honeypot off-screen and not `display:none`, submit label, microcopy) do not run until this passes.

### Notes on test corrections (not product defects)
- First E2E run had 12 more failures caused by the tests themselves, fixed without loosening the contract: `innerText` returned CSS-uppercased copy (now read with `text-transform` neutralised); the Umami stub route was not active in every test (now an auto fixture); the consent-settings test expected `lp_view` after deny→grant, but §9.2 says deny clears the queue (now asserts new events are recorded after re-granting); the privacy test required the abbreviation "ÚOOÚ" where the page names "Úřad pro ochranu osobních údajů (uoou.gov.cz)" (now checks `uoou.gov.cz`, since §5.8 lists topics, not verbatim copy).

## Resolved

### F1. `getEtfDataset()` and `GET /api/etfs` drop `ucits[].quotes.index` (owner: api; contract gap: architect) — fixed in `bffb227`, Vitest 73/73 green after the fix
- Tests: `tests/api/etfs.test.ts` › "returns 200, the cache header, and a body that passes the tests' own schema"; › "getEtfDataset returns the dataset and caches it".
- Expected: §8.3 "the body is exactly the validated dataset object" and §7.1 "Every row stores verbatim quotes". `data/etfs.json` validates, so the served object should equal the file.
- Actual: the response and `getEtfDataset()` equal the file except that `quotes.index` is missing on the UCITS rows `IE00B5BMR087`, `IE00BKM4GZ66` and `IE00BYXYYM63` (e.g. `"index": "Benchmark Index S&P 500 Index"`). The api's Zod schema strips quote keys not listed in §7.2, so verbatim evidence is lost.
- Root cause: §7.2 lists UCITS quotes as `ter`, `aum`, `isin` (+ optional `registration`), but the architect's data also carries `index` for three rows. Smallest fix: api keeps extra non-empty quote strings (e.g. `.catchall(z.string().min(1))` on the UCITS `quotes` object); architect may add `index` to §7.2.
