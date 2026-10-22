# Teacher Promotion Practice — True/False release report

**Branch:** `cursor/promotion-true-false-161d`  
**PR:** https://github.com/Ayiiga/Giga3-v2/pull/580  
**Date (Africa/Accra):** 22 Oct 2026

## Inventory (honest)

| Metric | Count |
|--------|------:|
| Rank-bank MCQs (AD II→Director I) | **259** |
| Rank-bank True/False | **25** (AD II only) |
| Rank-bank published total | **284** |
| Teacher-promotion mixed MCQs | **239** |
| Teacher-promotion True/False | **57** (rank unconfirmed) |
| Human-verified True/False | **0** |
| True/False pending review (SOURCE ANSWER — REVIEW REQUIRED) | **82** |
| Human-verified MCQs (teacher-promotion) | **24** |
| Approved MCQs (teacher-promotion) | **238** |
| Questions still requiring review (teacher-promotion pending) | **58** (1 MCQ + 57 TF) |
| All rank-bank items | pending_review / awaiting_verification |

### Ranks × formats

| Rank | MCQ | True/False |
|------|----:|-----------:|
| Assistant Director II (AD II) | 60 | 25 |
| Assistant Director I (AD I) | 56 | 0 — not available yet |
| Deputy Director (DD) | 50 | 0 — not available yet |
| Director II (D II) | 47 | 0 — not available yet |
| Director I (D I) | 46 | 0 — not available yet |

True/False from Benito 2025 / Aug 2024 mocks live on `exam-teacher-promotion` with **no** promotion rank assigned (mocks are not rank-specific evidence).

## Implementation

- Types: `questionType: "mcq" | "true_false"`
- Import: `scripts/extract-promotion-true-false.py` (AD2 Feb 2023, Benito 2025, Solved Aug 2024)
- Server: skip TF option shuffle; validate selection by option count; optional `questionType` filter on session start
- UI: large TRUE / FALSE controls; centre shows honest format availability
- Verification: all imported TF stay `pending_review` / `awaiting_verification` — not auto-approved as facts

## Tests run (this agent)

| Suite | Result |
|-------|--------|
| `promotionTrueFalse.test.ts` (11) | PASS |
| `promotionRankBanks.test.ts` (6) | PASS |
| `techHubQuestionBanks.test.ts` (9) | PASS |
| `examAnswerPositionBias.test.ts` (10) | PASS |
| `promotionDistractorRepair.test.ts` (8) | PASS |
| `examPracticeCentrePhaseB.test.ts` (6) | PASS |
| `examPracticeRewardsShare.test.ts` (7) | PASS |
| **Total** | **57/57 PASS** |
| `web` lint | PASS (pre-existing warnings only) |
| `web` production build | PASS (`✓ Compiled successfully`) |

## Merge / deploy status

| Item | Status |
|------|--------|
| Pull request | **#580** MERGED into `main` at `a36c3ded` (Africa/Accra 22 Oct 2026 17:02 UTC) |
| Vitest CI on PR | SUCCESS (`39818613988`) |
| Convex deploy | SUCCESS (`39819154321`) |
| Cloudflare Pages deploy | SUCCESS (`39819154344`) |
| Production public smoke | HTTP 200 for exam centre + AD II TF/MCQ deep links |
| Production signed-in TF session | **BLOCKED** — no `GIGA3_E2E_*` credentials in this environment |

## Post-merge follow-ups (Africa/Accra 22 Oct 2026)

| Item | Status |
|------|--------|
| Superseded PR #573 (empty vs main) | **Closed** |
| Deploy evidence PR #581 | **Merged** (`564f09b6`); Pages SUCCESS |
| PWA `CACHE_VERSION` bump (stale SW after TF UI) | **In progress** — `giga3-v58` |
| Factory Rollouts plan + production run for #580 | **Started** (convex + web) |
| Live exam JS contains True/False / `exam-session-tf` | **Verified** |
| Convex `/health` | **HTTP 200** `ok:true` |

## Remaining limitations

1. No True/False items are **human_verified**; practice shows provisional keys in learn mode.
2. AD I / DD / D II / D I have **MCQ only** — UI states this honestly.
3. Mock-sourced TF (Benito / Aug 2024) are not assigned to a promotion rank.
4. Source-supplied TRUE/FALSE keys are **not** treated as proof of legal/policy accuracy.
5. Authenticated production E2E smoke remains blocked without test credentials.
6. Do not advertise 500 / 2,500 verified questions — published ranks total **284**.
7. Draft PR #572 (answer-position bias) still open with a non-empty diff vs main — separate from TF; not auto-closed.
