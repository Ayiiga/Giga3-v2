# Promotion Exam Practice — answer-position bias audit

**Date:** 22 October 2026 (Africa/Accra)  
**Scope:** GigaLearn Teacher Promotion free orientation + Tech Hub `exam-teacher-promotion` bank  
**Claim:** Practice items are **not** official GES examination questions.

## Phase 1 findings

| Surface | Storage | Pre-fix bias |
|---------|---------|----------------|
| Free 50 (`promotionOrientationBank.ts`) | `options: {A..D}`, `correct: letter` | **43/50 correct = A**; correct option usually longest |
| JSON bank `teacher-promotion.json` | `options[]`, `correctIndex` | Indices ~balanced (63/53/68/55) but **179/239** tagged `weak_distractors` |
| Tech Hub grading | Server `correctIndex` vs learner index | Question order shuffled; **options not shuffled** (fixed) |

Evaluation path (free practice): select letter → `answers[id] === question.correct` → `scoreQuiz`.

## Phase 2–3 fix

- Fisher–Yates per-question option shuffle (`optionShuffle.ts`)
- Free practice: shuffle at session start; persist shuffled set + answers in `sessionStorage`
- Tech Hub: store `optionPermutationsJson` on session; present/grade via display↔original map
- Explanations show the **displayed** correct letter after reveal

## Phase 4 — question quality

### Free orientation bank
- Position bias removed by shuffle (source file still has many `correct: "A"` rows — that is intentional; display order is randomised per session).
- Absurd distractors improved toward topic-plausible parallels.
- Length-clue pass: distractors padded / rewritten so the correct option is no longer conspicuously longest (≥12 chars) on any of the 50 items.
- Still not an official GES paper — confirm Acts and directives against current law.

### JSON `teacher-promotion.json`
- **179** items previously tagged `weak_distractors` have been repaired (`distractors_repaired`).
- Generic fillers removed (e.g. “A personal preference without evidence”).
- Correct answer text and `correctIndex` preserved for every repaired item.
- **40** items tagged `needs_authoritative_verification` (history / legislation / institutions).
- All 179 remain `pending_review` with provisional scoring labels — not claimed as human-verified GES keys.
- Additionally repaired **60** approved applied-judgement items that reused shared filler distractors (`approved_filler_repaired`).

## Phase 5 — Tech Hub `optionPermutationsJson`

- Schema field optional on `gigaLearnTechSessions` (additive).
- `startTechPracticeSession` writes permutations; get/grade/submit map display↔original.
- Production Convex deploy still required for live sessions to persist the field — use GitHub Actions **Deploy Convex backend** (`CONVEX_DEPLOY_KEY`). Do not claim deploy success without CI verification.

## Final quality gate (22 Oct 2026)

See `docs/gigalearn/promotion-exam-final-quality-gate.md`.

- **238** practice-approved items; **1** held pending (`q008` 1987/6-3-3 association).
- **24** legal/policy claims `human_verified` against public sources (Constitution, Acts 506/778/1049/1023, MoE Free SHS, GES Scheme of Service).
- Stable `optionIds` / `correctOptionId` on all 239 bank items.
- Items remain **not** official GES examination questions.

## Tests

- `tests/gigalearn/examAnswerPositionBias.test.ts` — A–D placement, identity, scoring, session restore, tech permutations.
- `tests/gigalearn/promotionDistractorRepair.test.ts` — repaired bank gates, free length clues, Convex wiring, verification counts.
