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
| #577 | MERGED | `e240fa4aeb33fede6f1fccbd2e5accbd07768c4a` |

Current `origin/main` HEAD: `e240fa4aeb33fede6f1fccbd2e5accbd07768c4a`.

---

## Defects addressed in #577

| ID | Class | Finding | Action |
|----|-------|---------|--------|
| D1 | Deploy process | Convex path filter omitted `web/lib/gigalearn/**` (bundled into `gigaLearnTechBanks`) | **Fixed & deployed** |
| D2 | Verification gap | No Playwright Exam Practice coverage | **Fixed** — `tests/e2e/production-exam-practice.spec.ts` |
| D3 | Verification gap | Authenticated production shuffle/premium | **Still blocked** — no `GIGA3_E2E_*`; workflow_dispatch 403 |
| — | Scoring / entitlement software defect | None confirmed | — |

---

## Deployment evidence

| Workflow | Commit | Conclusion | Run |
|----------|--------|------------|-----|
| Deploy Convex backend | `e240fa4a` (#577) | **success** | [39799498290](https://github.com/Ayiiga/Giga3-v2/actions/runs/39799498290) |
| Deploy to Cloudflare Pages | `e240fa4a` (#577) | **success** | [39799498270](https://github.com/Ayiiga/Giga3-v2/actions/runs/39799498270) |
| CI — Unit & Security Tests | `e240fa4a` (#577) | **success** | [39799498301](https://github.com/Ayiiga/Giga3-v2/actions/runs/39799498301) |
| Deploy Convex backend | `34adfb46` (#575) | **success** | [39791120071](https://github.com/Ayiiga/Giga3-v2/actions/runs/39791120071) |
| Deploy to Cloudflare Pages | `945f9fbe` (#576) | **success** | [39794640618](https://github.com/Ayiiga/Giga3-v2/actions/runs/39794640618) |

---

## Verified in production

Post-#577 smoke 2026-10-22 ~15:00 UTC (Africa/Accra). Artifact: `/opt/cursor/artifacts/prod-smoke-post-577-2026-10-22.log`.

| Check | Result |
|-------|--------|
| Exam Centre, free practice, Academy, assess | **PASS** HTTP 200 |
| Five rank tech routes + teacher-promotion tech | **PASS** HTTP 200 |
| Rank course pages (ad-ii, director-i) | **PASS** HTTP 200 |
| Public HTML `correctIndex` / `correctOptionId` | **PASS** — 0 hits (12 routes) |
| Unauthenticated `startTechPracticeSession` | **PASS** — `UnauthorizedError` |

Browser smoke **does not** prove shuffle scoring or free/premium entitlement correctness.

---

## Verified in automated tests only

| Suite | Result |
|-------|--------|
| `vitest run tests/gigalearn/` (pre-merge #577) | **463 passed**, 9 skipped |
| Focused shuffle / entitlements / ranks / deploy-path | **58 passed** |
| PR #577 CI vitest | **success** ([39798062339](https://github.com/Ayiiga/Giga3-v2/actions/runs/39798062339)) |
| web lint / production build | **exit 0** |

Shuffle, option-permutation persistence, display↔original grading, free-tier premium-stem exclusion, and residual-credit non-unlock are covered by unit/integration tests + server code review.

---

## Blocked or unverified

| Check | Status | Why |
|-------|--------|-----|
| Authenticated start → answer → submit → restore → retry | **BLOCKED** | No authorized `GIGA3_E2E_*` credentials in agent env |
| Signed-in free vs premium stem access | **BLOCKED** | Same; cannot dispatch Production E2E (HTTP 403) |
| GUI hydration / console walkthrough | **UNVERIFIED** | No computer-use this pass |

**To reach RELEASE VERIFIED:** run Production E2E Verification with secrets, or provide authorized free + premium test accounts (do not alter real customer entitlements).

---

## Known content limitations

| Item | Status |
|------|--------|
| Published rank questions | **259** (not 2,500) — AD II 60 / AD I 56 / Deputy 50 / Director II 47 / Director I 46 |
| Free / premium-only | 243 / 16 |
| Teacher Promotion | 239; 238 approved; **q008** provisional; 24 human_verified |
| Official GES papers | **Not claimed** |

---

## Final release status

**DEPLOYED, PRODUCTION VERIFICATION INCOMPLETE**

`#574`–`#577` are on `main` at `e240fa4a`. Convex and Cloudflare Pages deploys for that commit succeeded. Public routes and unauthorized API checks pass. Authenticated production scoring and entitlement verification remain blocked without authorized E2E credentials.
