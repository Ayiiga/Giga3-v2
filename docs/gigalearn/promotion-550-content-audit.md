# Teacher Promotion 550 guides — content audit & rebuild

## Findings on uploaded “550” PDFs

Each uploaded GigaLearn `*_550_Questions_Answers*.pdf` parses to **550 numbered items**, but only **~84 unique stems** per rank. Approximately **466 items per PDF are exact repeats** of earlier questions (same wording and answer). Cross-rank sharing is high (60 shared stems; 28 appear in all five PDFs).

These PDFs must **not** be advertised as 550 distinct or verified questions.

## Rebuild + cross-rank dedupe

1. Preserve live bank items and IDs where unique.
2. Import additional unique stems from rank `500` sources and deduplicated 550-guide stems.
3. **Remove exact duplicate stems across ranks** (keep first occurrence in AD II → D I order).
4. Do not pad to 550 with repeats.
5. All items remain `pending_review` / `awaiting_verification`.
6. Primary download filenames use actual counts (`*_N_Practice_Questions_Answers.pdf`).

## Per-rank results after cross-rank dedupe

| Rank | Distinct | MCQ | True/False | Gap to 550 |
|------|---------:|----:|-----------:|-----------:|
| Assistant Director II | 295 | 241 | 54 | 255 |
| Assistant Director I | 87 | 78 | 9 | 463 |
| Deputy Director | 52 | 43 | 9 | 498 |
| Director II | 40 | 31 | 9 | 510 |
| Director I | 46 | 37 | 9 | 504 |

**Five-rank total:** 520 distinct publishable practice items (target 2,750 · gap 2,230).

## Remaining limitations

- No newly imported item is human-verified.
- Many remaining stems are formulaic practice items; expert review still required.
- Reaching a defensible 550 unique items per rank needs additional authoritative sources and human item-writing — not duplication.
