# Code review: Task B (stage 4)

Reviewer, 2026-10-28. Contract: `docs/plan.md` incl. Changelog r1. Reviewed at HEAD `45befe1` (api `9836d77`, web `e3d24a3..301a665`, tests `45befe1`, README `45d541f`). Scope: `web/app/api/**`, `web/lib/server/**`, `web/` client code, `web/next.config.ts`, package/lockfiles, `.gitignore`, `.env.example`, secrets, `tests/**`, README run section, commit history.

## Command results

Run locally on Windows at `45befe1`, clean working tree:

| Where | Command | Result |
|---|---|---|
| `web/` | `npx tsc --noEmit` | exit 0, no output |
| `web/` | `npm run lint` | exit 0, no warnings |
| `web/` | `npm run build` | exit 0; Next.js 16.4.3 (Turbopack); `/`, `/b`, `/soukromi`, `/api/etfs` static (○), `/api/leads` dynamic (ƒ) |
| `tests/` | `npx vitest run` | 5 files, **77/77 passed** (766 ms) |
| `tests/` | `npx playwright test` | **62/62 passed** (1.2 min, 1 worker, mobile Chromium 360×740, `next build && next start`, `STORAGE_DRIVER=memory`) |

No skipped tests (`.skip`/`.only`/`.fixme` grep: none).

## Findings

### Blocker
None.

### Major

**M1. Revoking analytics consent does not stop Umami** (owner: web)
- `web/lib/analytics.ts:132-135`, `web/components/site-footer.tsx:28`
- After grant → `consent-settings` → reject, `denyAnalyticsConsent()` only stops our own `track()` calls. The Umami script stays loaded and auto-tracks pageviews on client-side navigation (footer `privacy-link` is a `next/link`, so `/soukromi` is recorded after the visitor said no). Withdrawal of consent must take effect immediately (GDPR art. 7(3)); §5.8 promises it.
- Fix: in `denyAnalyticsConsent()` set `localStorage.setItem("umami.disabled", "1")` (Umami's documented opt-out, https://docs.umami.is/docs/exclude-my-own-visits) and remove it in `grantAnalyticsConsent()`; or `location.reload()` after a deny that follows a grant. Add an e2e case: accept → settings → reject → navigate → no request to the Umami collect endpoint. [INFERENCE: Umami reads the flag per send; verify in the e2e.]

### Minor

**m1. Lead save and daily counter are not atomic** (owner: api) — `web/lib/server/lead-store.ts:46-49`. If `INCR` fails after `SET NX` succeeds, the route returns 500, the user retries, gets `"exists"` → 200, and `stats:leads:*` (the declared ground truth, plan §9.4) undercounts by one. Fix: run `SET NX EX` + `INCR` in one `redis.multi()`/Lua script, or document the bounded undercount in decisions.md.

**m2. Body read before size check** (owner: api) — `web/app/api/leads/route.ts:57-69`. `request.text()` buffers the whole body before the 4096-byte check. Vercel caps bodies at 4.5 MB, so impact is low. Fix: reject early on `Content-Length > MAX_BODY_BYTES`, keep the post-read check.

**m3. Rate-limit key trusts the first `X-Forwarded-For` entry** (owner: api) — `web/lib/server/client-ip.ts:2-5`. Per contract §8.1 and safe on Vercel (the edge overwrites XFF), but spoofable behind any other proxy. Fix: note the Vercel-only assumption in decisions.md (no code change needed for launch).

**m4. Umami load failure leaks pending events** (owner: web) — `web/lib/analytics.ts:74-87`. No `script.onerror`: if an ad blocker blocks the script, `umamiState` stays `"loading"` and `umamiPending` grows without bound for the session. Fix: on `onerror` set a `"failed"` state and stop queueing.

**m5. Pre-consent queue drops the oldest event** (owner: web/architect) — `web/lib/analytics.ts:119-120` (per plan §9.2). If > 50 events fire before consent, `lp_view` (funnel top) is the first dropped. Fix: drop newest instead, or exempt `lp_view`; plan amendment.

**m6. Fixed sleeps in e2e** (owner: tests) — `tests/e2e/analytics.spec.ts:38,68,77,237,336`, `tests/e2e/hero.spec.ts:78,95`. Acceptable where they prove absence of an event after the 1000 ms debounce, but `hero.spec.ts` waits for smooth-scroll to settle with `waitForTimeout(800)`; use `expect.poll` on the bounding box instead to avoid flakes on slow CI.

**m7. No coverage of the Upstash code path** (owner: tests) — all API tests run `STORAGE_DRIVER=memory`; `SET NX EX LEAD_TTL_SECONDS`, the `INCR` and `Ratelimit` wiring (`lead-store.ts:43-65`, `rate-limit.ts:27-38`) are only exercised in production. Fix: one Vitest case with a stubbed `@upstash/redis` asserting `set(key, json, { nx: true, ex: 63072000 })`, or rely on the §15 Q9 production submit and say so in test-findings.

**m8. Repo hygiene** (owner: web / main)
- No root `.gitignore`; only `web/` and `tests/` have one. A stray `.env`/`.vercel`/`node_modules` at the root would be committable. Fix: root `.gitignore` with `.env*`, `!.env.example`, `node_modules/`, `.vercel`.
- `tests/package.json:15-19`: `@types/node ^26` and `typescript ^7` while the project targets Node 22 LTS and `web/` uses TypeScript ^5; no `engines`. Fix: align `@types/node` to `^22` and TypeScript to the web major (or log why).
- README §2 "Requires Node.js and npm": state Node 22 LTS (plan §10, `web/package.json` engines) and that `tests/` needs `web/npm ci` first (Vitest resolves `web/node_modules`, plan §10).
- README §11 links `ai-log/`, which does not exist yet (CLAUDE.md deliverable). Owner: main, at session end. (README §3 counts were updated in `fd28546` and match this run: 77/77, 62/62.)
- Commit granularity: mostly fine; `8548079` (26 files, +2564) and `7a3d131` (21 files, +3610 incl. lockfile) are large but single-purpose.

## Checked, no finding
- API contract §8.1–8.4: exports, `runtime`, `dynamic`, no `preferredRegion`; processing order 1–8; 415/413/400/422/429/500 bodies; `Retry-After` integer ≥ 1; `Cache-Control: no-store`; same 200 for created/exists; honeypot before validation; `CONSENT_VERSION` v2; `LEAD_TTL_SECONDS` 63072000 on `SET NX EX`; env read lazily; memory driver refused on `VERCEL_ENV=production`; no IP/UA stored.
- PII: no full email in any log (`route.ts:20-31` logs a 12-hex hash); client sends no email to analytics.
- Validation: all external input via Zod (`lead-schema.ts`, `etf-schema.ts`, Redis reads re-parsed in `lead-store.ts:57,63`).
- Secrets: grep of tree and full `git log -p` found no keys/tokens; `web/.env.example` lists every §8.5 variable with empty secrets; `.env*` ignored.
- Lockfiles present for `web/` and `tests/`. No `any`, `@ts-ignore`, `eslint-disable`, `.skip`/`.only` in `web/` or `tests/`.
- Consent: checkbox unchecked by default, API rejects missing/false consent; `consented_at` server-side ISO UTC; analytics script not loaded before opt-in; fonts self-hosted via `next/font`.
- Tests: meaningful (dataset invariants, contract edge cases, every-field 422, no-email-in-logs assertion, driver guards); none weakened.

## Verdict

**Changes requested.** No blockers; all checks green. One major (M1, web): withdrawing analytics consent must stop the already-loaded Umami tracker, with an e2e case for accept → reject. Minors m1–m8 can ship or be logged in `docs/decisions.md`; m8 README items belong to stage 5.
