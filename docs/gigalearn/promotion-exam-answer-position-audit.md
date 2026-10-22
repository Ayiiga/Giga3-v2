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
- Position bias removed by shuffle.
- Improved a batch of absurd distractors (shopping list, football score, customs duties, etc.) toward topic-plausible parallels.
- Remaining limitation: many correct options are still more detailed than distractors (length cue). Further editorial passes recommended; **do not invent official GES stems**.

### JSON `teacher-promotion.json` (flagged, not mass-rewritten)
- **179** items tagged `weak_distractors` (generic fillers like “A personal preference without evidence”).
- Status mostly `pending_review`.
- Recommendation: human editorial review before treating as high-stakes prep; keep provisional scoring labels.

## Tests

`tests/gigalearn/examAnswerPositionBias.test.ts` covers A–D placement, identity integrity, scoring, session restore, tech-bank permutations, and non-rotation shuffle.
