# Teacher Promotion 550 guides — content audit & rebuild

**Updated:** 22 October 2026 (Africa/Accra) — permanent fix pass after PR #587.

## Findings on uploaded “550” PDFs (historical)

Each uploaded GigaLearn `*_550_Questions_Answers*.pdf` parsed to **550 numbered items**, but only **~84 unique stems** per rank. Approximately **466 items per PDF were exact repeats**. Those PDFs must **not** be advertised as 550 distinct or verified questions.

## Cross-rank uniqueness

Exact duplicate stems are not counted across ranks. The published set is cross-rank unique at the normalize(stem) level (2,750 distinct stems).

## Current publishable banks (this pass)

| Rank | Distinct published | MCQ | True/False | Gap to 550 | Case labels |
|------|-------------------:|----:|-----------:|-----------:|------------:|
| Assistant Director II | 550 | 447 | 103 | 0 | 0 |
| Assistant Director I | 550 | 469 | 81 | 0 | 0 |
| Deputy Director | 550 | 466 | 84 | 0 | 0 |
| Director II | 550 | 465 | 85 | 0 | 0 |
| Director I | 550 | 466 | 84 | 0 | 0 |

**Five-rank total:** 2,750 distinct publishable practice items.

## What changed

1. Removed learner-facing `(case …)` labels from stems (IDs remain in metadata / `internalCaseKey`).
2. Rewrote leftover “which approach should be preferred” / “which practice is most appropriate” stems.
3. Regenerated per-option explanations with option-specific reasons (no “does not satisfy the question” template).
4. Expanded each rank to **550** distinct original practice scenarios.
5. Rank selector at `/gigalearn/exam/promotion/` shows **live** counts from `meta.json`.
6. Fixed article grammar (`an Assistant…`) in generated stems.

## Verification status (honest)

- Items remain `pending_review` / `awaiting_verification`.
- Source type: **original_practice** — not official GES examination questions.
- Human expert review of answer keys is still required before claiming “verified official” status.
- Do not invent or claim specific GES circular numbers as authoritative keys.
