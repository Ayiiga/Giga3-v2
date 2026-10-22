# Promotion Exam Practice — release verification

**Verification date:** 2026-10-22 (Africa/Accra)  
**Production URL:** https://www.giga3ai.com/  
**Report PR:** #576 (`cursor/promotion-release-report-161d`)  
**Final release status:** **DEPLOYED, PRODUCTION VERIFICATION INCOMPLETE**

---

## Merge SHAs (GitHub)

| PR | Status | Exact squash-merge SHA |
|----|--------|------------------------|
| #574 | MERGED | `dcf62b2ee490b1209b07e086614e17455d98a0b4` |
| #575 | MERGED | `34adfb46302f6857b9b79caa5bc4a928612fcc25` |

`origin/main` HEAD at verification: `34adfb46302f6857b9b79caa5bc4a928612fcc25`.

---

## Deployment evidence

| Workflow | Commit | Conclusion | Run |
|----------|--------|------------|-----|
| Deploy Convex backend | `34adfb46` (#575) | **success** | [39791120071](https://github.com/Ayiiga/Giga3-v2/actions/runs/39791120071) |
| Deploy to Cloudflare Pages | `34adfb46` (#575) | **success** | [39791120061](https://github.com/Ayiiga/Giga3-v2/actions/runs/39791120061) |
| CI — Unit & Security Tests | `34adfb46` (#575) | **success** | [39791120132](https://github.com/Ayiiga/Giga3-v2/actions/runs/39791120132) |
| Deploy Convex backend | `dcf62b2e` (#574) | **success** | [39789683433](https://github.com/Ayiiga/Giga3-v2/actions/runs/39789683433) |
| Deploy to Cloudflare Pages | `dcf62b2e` (#574) | **success** | [39789683454](https://github.com/Ayiiga/Giga3-v2/actions/runs/39789683454) |

No newer `main` deploy superseded `#575` at verification time.

---

## Verified in production

Public HTTP smoke against live `www.giga3ai.com` after `#575` deploy (re-checked 2026-10-22 ~14:06 UTC / 14:06 Africa/Accra). Artifact: `/opt/cursor/artifacts/prod-smoke-2026-10-22.log`.

| Check | Result |
|-------|--------|
| Exam Practice Centre `/gigalearn/exam/` | **PASS** HTTP 200 |
| Free Teacher Promotion practice `/gigalearn/exam/practice/` | **PASS** HTTP 200 |
| Academy `/gigalearn/academy/` + assess | **PASS** HTTP 200 |
| Rank tech routes `exam-ad-ii` … `exam-director-i` | **PASS** HTTP 200 each |
| Rank course pages `exam-ad-ii`, `exam-director-i` | **PASS** HTTP 200 |
| Teacher Promotion tech route | **PASS** HTTP 200 |
| Public HTML answer-key leakage (`correctIndex` / `correctOptionId`) | **PASS** — 0 hits on all smoked pages |
| Unauthenticated `startTechPracticeSession` (invalid/empty `sessionToken`) | **PASS** — Convex returns `UnauthorizedError` (no session / questions) |
| Missing-auth / wrong-arg probes | **PASS** — validation/auth errors only; no question payload returned |

Artifact: `/opt/cursor/artifacts/prod-unauthorized-api-2026-10-22.log`.

Browser smoke **does not** prove shuffle scoring or free/premium entitlement correctness.

---

## Verified in automated tests only

Commands re-run on release-report branch against the shipped bank + shuffle/entitlement code (2026-10-22):

| Suite | Command / scope | Result |
|-------|-----------------|--------|
| GigaLearn vitest | `./node_modules/.bin/vitest run tests/gigalearn/` | **461 passed**, 9 skipped (57 files) |
| Focused shuffle + entitlements + rank banks | `examAnswerPositionBias`, `examPracticeEntitlements`, `promotionRankBanks`, `promotionDistractorRepair`, `techHubQuestionBanks` | **56 passed** |
| Web lint | `cd web && npm run lint` | **exit 0** (pre-existing warnings only) |
| Production build | `cd web && npm run build` | **exit 0** → `web/out` |
| CI vitest on #576 head `9fb8d516` | [39791800669](https://github.com/Ayiiga/Giga3-v2/actions/runs/39791800669) | **success** |

### Shuffle / scoring (tests + code review of shipped implementation)

Covered by `tests/gigalearn/examAnswerPositionBias.test.ts`, `promotionDistractorRepair.test.ts`, and Convex wiring assertions:

- Each practice attempt persists displayed option order (`sessionStorage` free set; Tech Hub `optionPermutationsJson` on `gigaLearnTechSessions`).
- Grading maps displayed choices → original option indices (`toOriginalOptionIndex` / `displayCorrectIndex`).
- Displayed correct answer text matches the displayed options after permutation.
- Restoring a free-practice draft preserves option order and score.
- Different seeds produce different display orders without changing the underlying correct option identity.
- Public presentation (`presentTechQuestion` / `toPublicTechQuestion`) omits `correctIndex` until graded/learn feedback reveal paths.
- `startTechPracticeSession` return payload presents shuffled options and does not include `correctIndex` in the mutation response mapping (source + tests).

### Free / premium entitlements (tests + server code review)

Covered by `tests/gigalearn/examPracticeEntitlements.test.ts` and `promotionRankBanks.test.ts`:

- `freeTierOnly` / `isTechQuestionAccessible` exclude premium-only stems when `premiumAccess === false`.
- `resolveExamPracticeSessionCount` / `hasExamPracticePremiumAccess` deny residual credit balance unlock; require subscription or `credit_purchase`.
- Rank bank AD II/AD I include premium-only items that free selection must not return.
- Production unauthorized API confirms session requirement; **does not** by itself prove premium content filtering for a signed-in free user.

Artifacts: `/opt/cursor/artifacts/vitest-gigalearn-2026-10-22.log`, `/opt/cursor/artifacts/vitest-focused-shuffle-entitlements-2026-10-22.log`, `/opt/cursor/artifacts/web-lint-2026-10-22.log`, `/opt/cursor/artifacts/web-build-2026-10-22.log`.

---

## Blocked or unverified

| Check | Status | Why |
|-------|--------|-----|
| Authenticated shuffle scoring in production (start → answer → submit → restore → new attempt) | **BLOCKED / UNVERIFIED** | No `GIGA3_E2E_EMAIL` / `GIGA3_E2E_PASSWORD` (or other authorized production test account) in this environment. Auth was not bypassed. |
| Free-tier signed-in session receives only free stems | **BLOCKED / UNVERIFIED** | Needs authorized free production account. |
| Premium-tier signed-in session receives premium stems + larger pack | **BLOCKED / UNVERIFIED** | Needs authorized premium production account. Approval not given to change user entitlements. |
| Interactive browser console / hydration | **UNVERIFIED** | No GUI automation this pass. |
| Standalone `tsc --noEmit` | **NOT GATE** | Exit 2 with pre-existing errors outside promotion exam (marketplace, gigasocial, video project, etc.). Repo CI gate is vitest; lint + production Next build passed. No promotion-exam files in the tsc error list. |

---

## Known content limitations

| Item | Status |
|------|--------|
| Verified published rank-bank questions | **259** (not 2,500) — AD II 60 / AD I 56 / Deputy 50 / Director II 47 / Director I 46 |
| Rank free vs premium-only | 243 free-accessible / 16 premium-only |
| Teacher Promotion bank | 239 total; **238** `approved`; **1** `pending_review` (`exam-teacher-promotion-q008`); **24** `human_verified`; **0** `weak_distractors`; **239** stable `optionIds` |
| `q008` (1987 / 6-3-3) | **Provisional** — held; no invented GES claim |
| Rank items review status | Remain `pending_review` / awaiting verification — practice-usable, not claimed as official GES keys |
| Banks are not official GES examination papers | Explicit |

Fresh count audit of committed JSON on 2026-10-22 matches the 259 / 239 figures above. No silent answer-key changes were made for this verification pass.

---

## Question-bank counts (reconciled)

### Teacher Promotion (`exam-teacher-promotion`)

| Bucket | Count |
|--------|------:|
| Total | 239 |
| Practice-approved | 238 |
| Pending (`q008`) | 1 |
| Human-verified | 24 |
| Weak distractors | 0 |
| Length clues | 0 |
| Stable `optionIds` | 239 |

### Free orientation

| Bucket | Count |
|--------|------:|
| Total | 50 |

### Rank banks

| Rank | Published | Free | Premium-only | Gap to 500 |
|------|----------:|-----:|-------------:|-----------:|
| AD II | 60 | 50 | 10 | 440 |
| AD I | 56 | 50 | 6 | 444 |
| Deputy Director | 50 | 50 | 0 | 450 |
| Director II | 47 | 47 | 0 | 453 |
| Director I | 46 | 46 | 0 | 454 |
| **Total** | **259** | **243** | **16** | **2241** |

---

## Authoritative verification sources

See `docs/gigalearn/promotion-exam-final-quality-gate.md` (Constitution Art. 25, Acts 506/778/1049/1023, MoE Free SHS, GES Scheme of Service / history).

---

## Final release status

**DEPLOYED, PRODUCTION VERIFICATION INCOMPLETE**

Required product merges `#574` (`dcf62b2e`) and `#575` (`34adfb46`) are on `main`. Convex and Cloudflare Pages deploys for `34adfb46` succeeded. Public routes return HTTP 200 without answer-key leakage; unauthenticated Convex session start is rejected. Shuffle scoring and free/premium entitlement behaviour are covered by automated tests and server-side code review, but **authenticated production verification remains blocked** without an authorized test account. Do not treat this report as **RELEASE VERIFIED**.
