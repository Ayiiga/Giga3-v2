# Promotion Exam Practice — release verification

**Date:** 2026-10-22 (Africa/Accra)  
**Production URL:** https://www.giga3ai.com/

## 1. Initial repository state

| Item | Value |
|------|-------|
| Prior PR | [#574](https://github.com/Ayiiga/Giga3-v2/pull/574) — **MERGED** 2026-10-22T13:45:25Z |
| Prior head | `e4dbc4645ef1133a3b520cfd8c1da8311c4619dc` (squash-merged) |
| Merge commit on `main` | `dcf62b2ee490b1209b07e086614e17455d98a0b4` |
| CI on merge | Unit tests **success** |
| Convex deploy (`dcf62b2e`) | **success** — [run 39789683433](https://github.com/Ayiiga/Giga3-v2/actions/runs/39789683433) |
| Cloudflare Pages (`dcf62b2e`) | **success** — [run 39789683454](https://github.com/Ayiiga/Giga3-v2/actions/runs/39789683454) |
| Rank banks PR #573 | OPEN, **CONFLICTING** with `main` after #574 |

## 2. Confirmed issues discovered

| ID | Class | Issue |
|----|-------|-------|
| I1 | E | `q008` (1987 / 6-3-3) remains provisional — correctly held |
| I2 | C/D | Five rank banks not on `main` (PR #573 conflicted) — incomplete rank UI/loader |
| I3 | E | Free orientation source still A-heavy before shuffle (display fixed by Fisher–Yates) |
| I4 | E | Rank banks do not reach 500/rank — honest gaps (259 unique published), not fabricated |

No confirmed scoring/shuffle regressions on `main` after #574.

## 3. Fixes implemented (corrective)

Branch: `cursor/promotion-rank-banks-rebase-161d` (rebased onto post-#574 `main`).

- Registered AD II / AD I / Deputy Director / Director II / Director I JSON banks in `techBankServer`
- Free-tier `accessTier` filter in selection + Convex `startTechPracticeSession`
- Exam Practice Centre rank cards + Academy catalogue courses
- Honest meta / import-report counts (not 2500 verified)
- Preserved #574 teacher-promotion quality gate (238 approved, 1 pending, 24 human-verified)

## 4. Question-bank counts (reconciled)

### Teacher Promotion aptitude (`exam-teacher-promotion`)

| Bucket | Count |
|--------|------:|
| Total unique | 239 |
| Practice-approved | 238 |
| Pending review | 1 (`q008`) |
| Human-verified (public sources) | 24 |
| Weak distractors remaining | 0 |
| Length clues (≥12) | 0 |
| Stable `optionIds` | 239 |

### Free orientation (`promotionOrientationBank.ts`)

| Bucket | Count |
|--------|------:|
| Total | 50 |
| Length clues | 0 |
| Source letter A/B (pre-shuffle) | 43 / 7 |

### Rank banks (honest published practice)

| Rank | Published | Free | Premium-only | Gap to 500 | Verification |
|------|----------:|-----:|-------------:|-----------:|--------------|
| AD II | 60 | 50 | 10 | 440 | awaiting |
| AD I | 56 | 50 | 6 | 444 | awaiting |
| Deputy Director | 50 | 50 | 0 | 450 | awaiting |
| Director II | 47 | 47 | 0 | 453 | awaiting |
| Director I | 46 | 46 | 0 | 454 | awaiting |
| **Total** | **259** | **243** | **16** | **2241** | |

Not official GES examination papers.

## 5. Authoritative verification sources

See `docs/gigalearn/promotion-exam-final-quality-gate.md` (Constitution Art. 25, Acts 506/778/1049/1023, MoE Free SHS, GES Scheme of Service / history).

## 6. Provisional

- `exam-teacher-promotion-q008` — 1987 / 6-3-3 association held pending syllabus-level corroboration.
- All rank-bank items remain `pending_review` / `awaiting_verification`.

## 7. Test results (corrective branch final candidate)

| Check | Result |
|-------|--------|
| `tests/gigalearn/` | **461 passed**, 9 skipped |
| Lint | Exit 0 (pre-existing warnings only) |
| Production build | (run before merge on candidate) |

Existing skips: 9 (pre-existing). No new skips introduced to hide failures.

## 8–11. Merge / deploy status

| Field | Status |
|-------|--------|
| Corrective PR | [#575](https://github.com/Ayiiga/Giga3-v2/pull/575) — `cursor/promotion-rank-banks-rebase-161d` @ `9841e87d` |
| Merge commit SHA | _(awaiting CI + merge)_ |
| Convex deploy | #574: **success** on `dcf62b2e` ([39789683433](https://github.com/Ayiiga/Giga3-v2/actions/runs/39789683433)); corrective: _(pending merge)_ |
| Cloudflare Pages | #574: **success** on `dcf62b2e` ([39789683454](https://github.com/Ayiiga/Giga3-v2/actions/runs/39789683454)); corrective: _(pending merge)_ |
| Supersedes | [#573](https://github.com/Ayiiga/Giga3-v2/pull/573) (conflicted) |

## 12. Production smoke tests (#574 deploy on www.giga3ai.com)

Public HTTP checks (no auth / no paid actions), 2026-10-22:

| Check | Result |
|-------|--------|
| A. Exam Practice Centre loads | **PASS** HTTP 200 `/gigalearn/exam/` (Teacher Promotion / Exam Practice present) |
| B. Teacher Promotion free practice route | **PASS** HTTP 200 `/gigalearn/exam/practice/` |
| C. Rank banks open | **FAIL / N/A on #574 alone** — rank banks not yet on production until #575 merges |
| D–E. Free/premium server rules | **UNVERIFIED** (requires signed-in production session) |
| F–J. Shuffle scoring / navigation / new attempt | **UNVERIFIED** (requires authenticated practice session) |
| K. Tech Hub permutations on Convex | **LIKELY** — Convex deploy succeeded for `dcf62b2e` with `optionPermutationsJson`; interactive attempt not exercised |
| L. Answer-key leakage in public HTML | **PASS** — no `correctIndex` / `correctOptionId` in public responses |
| M. Academy / assess routes | **PASS** HTTP 200 `/gigalearn/academy/`, `/gigalearn/academy/assess/`, teacher course + tech URLs |
| N. Console/hydration | **UNVERIFIED** (no browser automation in this pass) |

## 13. Remaining limitations

- Rank banks below 500/rank (honest backlog).
- `q008` provisional.
- Free source letter distribution unbalanced before shuffle.

## 14. Final release status

**DEPLOYED, PRODUCTION VERIFICATION INCOMPLETE** for #574 alone (deployed; smoke + rank banks pending corrective).  
Updated after corrective merge/deploy.
