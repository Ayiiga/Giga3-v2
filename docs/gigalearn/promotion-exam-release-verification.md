# Promotion Exam Practice — release verification

**Verification date:** 2026-10-22 (Africa/Accra)  
**Production URL:** https://www.giga3ai.com/  
**Final release status:** **DEPLOYED, PRODUCTION VERIFICATION INCOMPLETE**

---

## Merge SHAs (GitHub)

| PR | Status | Exact squash-merge SHA |
|----|--------|------------------------|
| #574 | MERGED | `dcf62b2ee490b1209b07e086614e17455d98a0b4` |
| #575 | MERGED | `34adfb46302f6857b9b79caa5bc4a928612fcc25` |
| #576 | MERGED | `945f9fbe0df26541ef38c2c85fd3feb2a490172d` |

`origin/main` HEAD at start of this verification pass: `945f9fbe0df26541ef38c2c85fd3feb2a490172d`.

Product code for shuffle / rank banks / entitlements shipped in `#574` + `#575`. `#576` was docs-only.

---

## Defects found this pass

| ID | Class | Finding | Action |
|----|-------|---------|--------|
| D1 | Deploy process | Convex deploy path filter watched only `convex/**`, but `gigaLearnTechBanks` bundles `web/lib/gigalearn/**` (banks, shuffle, limits). Bank-only changes could skip Convex redeploy. | **Fixed** — add `web/lib/gigalearn/**` to `.github/workflows/convex-deploy.yml` |
| D2 | Verification gap | No Playwright coverage for Exam Centre / free practice / rank tech routes | **Fixed** — `tests/e2e/production-exam-practice.spec.ts` (+ exam routes in `productionRoutes`) |
| D3 | Verification gap | Authenticated production shuffle/premium checks | **Blocked** — no `GIGA3_E2E_*` in agent env; `gh workflow run production-e2e.yml` returns HTTP 403 |
| — | Software defect in scoring/entitlement | None confirmed against latest `main` code + tests | — |

`convex/gigaLearnTechBanks.ts` (~`parseOptionPermutations` / session start / grade) reviewed: permutations persisted, display↔original grading, public present omits keys until reveal; unauthenticated start rejected in production.

---

## Deployment evidence

| Workflow | Commit | Conclusion | Run |
|----------|--------|------------|-----|
| Deploy to Cloudflare Pages | `945f9fbe` (#576) | **success** | [39794640618](https://github.com/Ayiiga/Giga3-v2/actions/runs/39794640618) |
| CI — Unit & Security Tests | `945f9fbe` (#576) | **success** | [39794640346](https://github.com/Ayiiga/Giga3-v2/actions/runs/39794640346) |
| Deploy Convex backend | `34adfb46` (#575) | **success** | [39791120071](https://github.com/Ayiiga/Giga3-v2/actions/runs/39791120071) |
| Deploy to Cloudflare Pages | `34adfb46` (#575) | **success** | [39791120061](https://github.com/Ayiiga/Giga3-v2/actions/runs/39791120061) |
| Deploy Convex backend | `dcf62b2e` (#574) | **success** | [39789683433](https://github.com/Ayiiga/Giga3-v2/actions/runs/39789683433) |

No Convex deploy for `945f9fbe` (docs-only; path filter correctly skipped). Live Convex product code remains from `#575` deploy until a corrective Convex path change merges.

---

## Verified in production

Re-checked live `www.giga3ai.com` 2026-10-22 ~14:41 UTC (Africa/Accra). Artifact: `/opt/cursor/artifacts/prod-smoke-final-2026-10-22.log`.

| Check | Result |
|-------|--------|
| Exam Practice Centre `/gigalearn/exam/` | **PASS** HTTP 200 |
| Free Teacher Promotion practice `/gigalearn/exam/practice/` | **PASS** HTTP 200 |
| Academy `/gigalearn/academy/` | **PASS** HTTP 200 |
| Rank tech routes `exam-ad-ii` … `exam-director-i` | **PASS** HTTP 200 each |
| Teacher Promotion tech route | **PASS** HTTP 200 |
| Public HTML answer-key leakage (`correctIndex` / `correctOptionId`) | **PASS** — 0 hits |
| Unauthenticated `startTechPracticeSession` | **PASS** — `UnauthorizedError` |

Browser smoke **does not** prove shuffle scoring or free/premium entitlement correctness.

---

## Verified in automated tests only

| Suite | Result |
|-------|--------|
| `./node_modules/.bin/vitest run tests/gigalearn/` | **463 passed**, 9 skipped (58 files) |
| Focused shuffle / entitlements / ranks / deploy-path | **58 passed** |
| `cd web && npm run lint` | **exit 0** (pre-existing warnings) |
| `cd web && npm run build` | **exit 0** |

### Shuffle / scoring (automated)

- Free practice: Fisher–Yates + `sessionStorage` restore; score follows shuffled key.
- Tech Hub: `optionPermutationsJson` on session; grade via `toOriginalOptionIndex` / `displayCorrectIndex`.
- Public present omits `correctIndex` until learn/grade reveal.

### Free / premium entitlements (automated + unauthorized prod probe)

- Server clamps free packs to 50; residual credits do not unlock premium.
- Free selection excludes premium-only AD II/AD I stems.
- Production unauthenticated start fails; signed-in free/premium still **not** exercised in production.

---

## Blocked or unverified

| Check | Status | Why |
|-------|--------|-----|
| Authenticated shuffle scoring in production | **BLOCKED** | No `GIGA3_E2E_EMAIL` / `GIGA3_E2E_PASSWORD` locally; cannot dispatch `production-e2e.yml` (HTTP 403) |
| Signed-in free vs premium stem access in production | **BLOCKED** | Same credential / dispatch blocker |
| GUI console / hydration walkthrough | **UNVERIFIED** | No computer-use this pass |
| Standalone `tsc --noEmit` | **NOT GATE** | Pre-existing non-exam errors; CI gate is vitest + lint + Pages build |

**External action needed for RELEASE VERIFIED:** provide authorized free + premium E2E accounts (or grant workflow_dispatch for Production E2E Verification) without changing real customer entitlements.

---

## Known content limitations

| Item | Status |
|------|--------|
| Published rank-bank questions | **259** (not 2,500) |
| Rank free / premium-only | 243 / 16 |
| Teacher Promotion | 239 total; 238 approved; **q008** provisional; 24 human_verified |
| Official GES papers | **Not claimed** |

---

## Question-bank counts (fresh recount)

| Rank | Published | Free | Premium-only |
|------|----------:|-----:|-------------:|
| AD II | 60 | 50 | 10 |
| AD I | 56 | 50 | 6 |
| Deputy Director | 50 | 50 | 0 |
| Director II | 47 | 47 | 0 |
| Director I | 46 | 46 | 0 |
| **Total** | **259** | **243** | **16** |

Teacher Promotion: 239 (238 approved, 1 pending `q008`). Free orientation: 50.

---

## Final release status

**DEPLOYED, PRODUCTION VERIFICATION INCOMPLETE**

`#574` / `#575` / `#576` are on `main`. Cloudflare Pages for `945f9fbe` and Convex for `34adfb46` succeeded. Public routes and unauthorized API checks pass. Corrective work adds Convex deploy path coverage for bundled GigaLearn banks and repeatable exam Playwright specs. Authenticated production scoring and entitlement checks remain blocked without authorized credentials.
