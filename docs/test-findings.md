# Test findings

Written by the tests agent from `docs/plan.md` / `docs/ads.md` only (implementation not read).
Each entry: test, expected per contract, actual, owner. Run commands: see `tests/package.json`.

## Open

### F1. `getEtfDataset()` and `GET /api/etfs` drop `ucits[].quotes.index` (owner: api; contract gap: architect)
- Tests: `tests/api/etfs.test.ts` › "returns 200, the cache header, and a body that passes the tests' own schema"; › "getEtfDataset returns the dataset and caches it".
- Expected: §8.3 "the body is exactly the validated dataset object" and §7.1 "Every row stores verbatim quotes". `data/etfs.json` validates, so the served object should equal the file.
- Actual: the response and `getEtfDataset()` equal the file except that `quotes.index` is missing on the UCITS rows `IE00B5BMR087`, `IE00BKM4GZ66` and `IE00BYXYYM63` (e.g. `"index": "Benchmark Index S&P 500 Index"`). The api's Zod schema strips quote keys not listed in §7.2, so verbatim evidence is lost.
- Root cause: §7.2 lists UCITS quotes as `ter`, `aum`, `isin` (+ optional `registration`), but the architect's data also carries `index` for three rows. Smallest fix: api keeps extra non-empty quote strings (e.g. `.catchall(z.string().min(1))` on the UCITS `quotes` object); architect may add `index` to §7.2.
