# Promotion Exam Practice — release verification

**Date:** 2026-10-22 (Africa/Accra)  
**Production URL:** https://www.giga3ai.com/

## 1. Initial repository state

| Item | Value |
|------|-------|
| Prior PR #574 | **MERGED** — squash merge `dcf62b2ee490b1209b07e086614e17455d98a0b4` (2026-10-22T13:45:25Z) |
| Prior head before squash | `e4dbc4645ef1133a3b520cfd8c1da8311c4619dc` |
| Corrective PR #575 | **MERGED** — squash merge `34adfb46302f6857b9b79caa5bc4a928612fcc25` (2026-10-22T13:54:51Z) |
| Final `main` HEAD | `34adfb46302f6857b9b79caa5bc4a928612fcc25` |

## 2. Confirmed issues discovered

| ID | Class | Issue | Resolution |
|----|-------|-------|------------|
| I1 | E | `q008` (1987/6-3-3) provisional | Held pending — not invented |
| I2 | C | Rank banks missing after #574 (#573 conflicted) | Landed via #575 rebase |
| I3 | E | Free bank source A-heavy pre-shuffle | Non-blocking; Fisher–Yates randomises display |
| I4 | E | Rank banks &lt; 500/rank | Honest backlog (259 published); not fabricated |

No confirmed shuffle/scoring defects on the released commits.

## 3. Fixes implemented

### #574 (already on main before corrective)
- Fisher–Yates option shuffle + session persistence
- Tech Hub `optionPermutationsJson`
- 179 weak distractors repaired + 60 filler cleanups
- Quality gate: 238 practice-approved, 24 human-verified, 1 pending

### #575 (corrective)
- Five rank banks registered (AD II–Director I)
- Free-tier `accessTier` server filter
- Exam Practice Centre rank cards + Academy courses
- Honest meta/import counts

## 4. Question-bank counts (reconciled)

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
| Length clues | 0 |

### Rank banks
| Rank | Published | Free | Premium-only | Gap to 500 |
|------|----------:|-----:|-------------:|-----------:|
| AD II | 60 | 50 | 10 | 440 |
| AD I | 56 | 50 | 6 | 444 |
| Deputy Director | 50 | 50 | 0 | 450 |
| Director II | 47 | 47 | 0 | 453 |
| Director I | 46 | 46 | 0 | 454 |
| **Total** | **259** | **243** | **16** | **2241** |

Not official GES examination papers.

## 5. Authoritative verification sources

See `docs/gigalearn/promotion-exam-final-quality-gate.md` (Constitution Art. 25, Acts 506/778/1049/1023, MoE Free SHS, GES Scheme of Service / history).

## 6. Provisional

- `exam-teacher-promotion-q008` held.
- Rank-bank items remain `pending_review` / `awaiting_verification`.

## 7. Test results

| Suite | Result |
|-------|--------|
| #575 local `tests/gigalearn/` | **461 passed**, 9 skipped |
| #575 CI vitest | **success** |
| Lint / production build (local on candidate) | Pass (pre-existing lint warnings only) |

## 8–11. Merge and deployment

| Field | Result |
|-------|--------|
| Final merge commit | `34adfb46302f6857b9b79caa5bc4a928612fcc25` |
| Convex deploy | **success** — [39791120071](https://github.com/Ayiiga/Giga3-v2/actions/runs/39791120071) (`34adfb46`) |
| Cloudflare Pages | **success** — [39791120061](https://github.com/Ayiiga/Giga3-v2/actions/runs/39791120061) (`34adfb46`) |
| Prior #574 Convex | **success** — [39789683433](https://github.com/Ayiiga/Giga3-v2/actions/runs/39789683433) |
| Prior #574 Pages | **success** — [39789683454](https://github.com/Ayiiga/Giga3-v2/actions/runs/39789683454) |

## 12. Production smoke tests (www.giga3ai.com after #575 deploy)

Public HTTP only (no paid actions; no authenticated session available):

| Check | Result |
|-------|--------|
| A. Exam Practice Centre | **PASS** HTTP 200 |
| B. Teacher Promotion free practice | **PASS** HTTP 200 |
| C. Rank tech routes (ad-ii, ad-i, deputy, director-ii, director-i) | **PASS** HTTP 200 each |
| C′. Rank course pages (ad-ii, director-i) | **PASS** HTTP 200 |
| D–E. Free/premium entitlement | **UNVERIFIED** (needs signed-in production user) |
| F–J. Shuffle scoring / nav / refresh / new attempt | **UNVERIFIED** (needs authenticated practice session) |
| K. Tech Hub permutations deployed | **PASS** (Convex workflow success for `34adfb46` including schema/mutations) — interactive attempt not run |
| L. Answer-key leakage in public HTML | **PASS** (no `correctIndex` / `correctOptionId`) |
| M. Academy / assess | **PASS** HTTP 200 |
| N. Console/hydration | **UNVERIFIED** (no browser automation) |

## 13. Remaining limitations

- Authenticated end-to-end scoring/premium checks not run in production.
- Rank banks below 500/rank (honest backlog).
- `q008` provisional.
- Superseded conflicted PR #573 remains open unless closed manually.

## 14. Final release status

**DEPLOYED, PRODUCTION VERIFICATION INCOMPLETE**

Required merges and both production deployments for `34adfb46` succeeded. Public routes including rank banks return HTTP 200 without answer-key leakage. Authenticated shuffle scoring and premium entitlement checks remain unverified in production.
