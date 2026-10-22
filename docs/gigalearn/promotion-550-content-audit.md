# Teacher Promotion 550 guides — content audit & rebuild

## Findings on uploaded “550” PDFs

Each uploaded GigaLearn `*_550_Questions_Answers*.pdf` parses to **550 numbered items**, but only **~84 unique stems** per rank. Approximately **466 items per PDF are exact repeats** of earlier questions (same wording and answer). Cross-rank sharing is high (60 shared stems; 28 appear in all five PDFs).

MCQ letter distribution is perfectly balanced (110 A/B/C/D), consistent with synthetic padding rather than independent item writing.

These PDFs must **not** be advertised as 550 distinct or verified questions.

## Rebuild policy

1. Preserve existing live bank items and IDs.
2. Import additional **exact-unique / near-unique** stems from the original rank `500` source texts and from deduplicated 550-guide stems.
3. Do not pad to 550 with repeats.
4. All items remain `pending_review` / `awaiting_verification` (SOURCE ANSWER — REVIEW REQUIRED) unless already human-verified.
5. Publish honest counts and the gap to the 550 target.

## Per-rank results after rebuild

| Rank | Distinct | MCQ | True/False | Added this run | Gap to 550 |
|------|---------:|----:|-----------:|---------------:|-----------:|
| Assistant Director II | 295 | 241 | 54 | 210 | 255 |
| Assistant Director I | 282 | 253 | 29 | 226 | 268 |
| Deputy Director | 276 | 247 | 29 | 226 | 274 |
| Director II | 281 | 252 | 29 | 234 | 269 |
| Director I | 285 | 256 | 29 | 239 | 265 |

**Five-rank total:** 1419 distinct publishable practice items (target 2,750 · gap 1331).

## Remaining limitations

- No newly imported item is human-verified.
- Original 500 source banks themselves contain formulaic stems/explanations; near-duplicate filtering removes many but quality still requires expert review.
- Reaching a defensible 550 unique items per rank needs additional authoritative source materials and human item-writing / verification — not duplication.

