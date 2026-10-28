# Pipeline (Task B)

Task -> CLAUDE.md -> architect -> [api | web | tests in parallel] -> critic -> reviewer -> deploy

Each stage writes its result to a file and commits. Agents live in `.claude/agents/`.

| # | Stage | Agent | Output | Gate to continue |
|---|-------|-------|--------|------------------|
| 0 | Setup | you | repo, CLAUDE.md, agents | repo public on GitHub |
| 1 | Architecture | architect | docs/plan.md, docs/ads.md | you read and approve the plan |
| 2 | Build (parallel) | api, web, tests | web/ (api: web/app/api/, web/lib/server/), tests/, data/etfs.json | build passes, tests run |
| 3 | Product critique | critic | docs/critic.md | no blockers |
| 4 | Code review | reviewer | docs/review.md | verdict: approve |
| 5 | Deploy | you | Vercel URL | you confirm; phone test passes |

## How to run
1. "Use the architect agent to produce the plan for Task B." Read docs/plan.md and fix what you disagree with.
2. Launch api, web, tests in the same turn: "Follow docs/plan.md." tests must not read web/ source.
3. Launch critic. Send each finding to its owner. Max 2 fix rounds.
4. Launch reviewer. Same fix loop.
5. Deploy to Vercel only after you confirm. Test the live URL on a real phone: submit the form, check the events.

## Rules
- docs/plan.md is the single source of truth; changes go through the architect.
- One owner per directory. Agents file findings instead of editing each other's files.
- Every stage commits (Conventional Commits). Judgment calls go to docs/decisions.md.
- Export every session with /export into ai-log/.

## README "How AI was used"
- Instructions: CLAUDE.md + .claude/agents/*.md
- Checks: tests, critic, reviewer, phone test, source spot-checks
- Where AI was wrong: real examples from docs/critic.md, docs/review.md, docs/test-findings.md

## Time budget (deadline 2026-10-30)
Architect + your review 1.5 h; build 3 h; critic + fixes 1.5 h; reviewer + fixes 1 h; deploy + phone test + README + ai-log 1.5 h.
If behind: cut interactive features first, never real data, sources, consent, or measurement.
