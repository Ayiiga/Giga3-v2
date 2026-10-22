# Promotion rank banks — PDF audit and integration (2026-10-22)

## Verdict

PDF filenames claim **500 questions × 5 ranks = 2,500**. After extraction, dedupe, and quality gates, GigaLearn ships **259 unique publishable practice items** across five separate rank banks. Gaps to the 500-per-rank target are tracked as backlog — **not** filled with duplicates or unverified placeholders labelled as verified.

Original PDFs under the agent uploads folder are **unchanged**.

## Phase 2 — per-rank audit (source PDFs)

| Rank | Found in PDF | Exact unique stems | Exact duplicates | Near-dup extras | 4 alternatives | Clear answer key | Strict factual pass | Needs rewrite (heuristic) | Outdated/unverified claims |
|------|-------------:|-------------------:|-----------------:|----------------:|---------------:|-----------------:|--------------------:|--------------------------:|---------------------------:|
| AD II | 500 | 205 | 295 | 352 | 500 | 500 | 0 | 632 | 500 |
| AD I | 500 | 216 | 284 | 340 | 500 | 500 | 0 | 624 | 500 |
| Deputy Director | 500 | 209 | 291 | 346 | 500 | 500 | 0 | 620 | 500 |
| Director II | 500 | 198 | 302 | 358 | 500 | 500 | 0 | 640 | 500 |
| Director I | 500 | 191 | 309 | 365 | 500 | 500 | 0 | 650 | 500 |

Notes from automated review:

- Every item had A–D options and a stated key letter that matched an option string.
- **0** items passed strict factual verification (Acts, GES org charts, statute citations).
- Stems and explanations were heavily templated; many correct options were the longest string (test-wiseness clue).
- Cross-rank overlap was severe — the same stem families appeared in multiple PDFs.
- Near-duplicates with slight wording changes were **not** counted as distinct unless they assessed a different skill.

Machine-readable detail: `/opt/cursor/artifacts/promo-audit/phase2-audit-summary.json`.

## Phase 3–4 — published banks (honest counts)

| Rank | Course slug | Published unique | Free | Premium-only | Gap to 500 | Verification |
|------|-------------|---------------:|-----:|-------------:|-----------:|--------------|
| AD II | `exam-ad-ii` | 60 | 50 | 10 | 440 | `awaiting_verification` |
| AD I | `exam-ad-i` | 56 | 50 | 6 | 444 | `awaiting_verification` |
| Deputy Director | `exam-deputy-director` | 50 | 50 | 0 | 450 | `awaiting_verification` |
| Director II | `exam-director-ii` | 47 | 47 | 0 | 453 | `awaiting_verification` |
| Director I | `exam-director-i` | 46 | 46 | 0 | 454 | `awaiting_verification` |
| **Total** | | **259** | **243** | **16** | **2,241** | |

Source type on every shipped item: `original_practice` (adapted/rewritten from study PDF material).  
Review status: `pending_review`. Provisional keys are labelled in learn/grade flows — **not** marked human-verified.

Study frameworks used for topic assignment (not official GES syllabuses):

- **AD II** — classroom practice, assessment, curriculum, ethics, teaching & learning  
- **AD I** — instructional supervision, staff development, school improvement  
- **Deputy Director** — institutional/district management, M&E, resource accountability  
- **Director II** — strategic planning, governance, policy implementation  
- **Director I** — advanced strategic leadership, organisational governance, public-sector accountability  

## Phase 5–6 — data model and entitlements

Each question supports stable `questionId`, `optionIds`, `correctIndex` / `correctOptionId`, topic, explanation, difficulty, `accessTier` (`free` | `premium`), `sourceType`, `verificationStatus`, `publicationStatus`, `promotionRank`.

Integration path (existing architecture):

- Banks: `web/lib/gigalearn/examPractice/banks/{ad-ii,ad-i,deputy-director,director-ii,director-i}.json`
- Meta: `web/lib/gigalearn/examPractice/banks/meta.json`
- Loader: `techBankServer.ts` (same session/grade path as BECE / Teacher Promotion)
- Entitlement: `practiceLimits.ts` + `startTechPracticeSession` — free callers clamped to 50 **and** filtered to `accessTier` including `free` so premium stems are not returned
- Catalogue / Centre: Academy course entries + Exam Practice Centre rank cards

No new prices; residual credit balance still does not unlock premium packs.

## Content-development backlog

1. Author additional **rank-specific** scenarios to close gaps to 500 per rank (no cross-rank paste).
2. Human-verify any item that cites Acts, GES structures, or named policies before flipping `verificationStatus` to `human_verified`.
3. Replace remaining length-clue options with parallel-length distractors where needed.
4. Do **not** mark items verified until an education specialist reviews them.

## Provenance disclaimer

These banks are **independent GigaLearn practice material**. They are not official Ghana Education Service examination papers and must not be marketed as verified historical papers.
