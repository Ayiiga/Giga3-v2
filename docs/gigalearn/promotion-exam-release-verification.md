# Promotion Exam Practice — release verification

**Verification date:** 2026-10-22 (Africa/Accra)  
**Production URL:** https://www.giga3ai.com/  
**Final release status:** Updated by post-#583 cross-rank dedupe branch (see latest PR).

---

## Merge SHAs (GitHub) — prior ship train

| PR | Status | Exact squash-merge SHA |
|----|--------|------------------------|
| #574 | MERGED | `dcf62b2ee490b1209b07e086614e17455d98a0b4` |
| #575 | MERGED | `34adfb46302f6857b9b79caa5bc4a928612fcc25` |
| #576 | MERGED | `945f9fbe0df26541ef38c2c85fd3feb2a490172d` |
| #577 | MERGED | `e240fa4aeb33fede6f1fccbd2e5accbd07768c4a` |
| #580 | MERGED | `a36c3dedb095bd2e5fc3240b194f81f73358ba69` |
| #583 | MERGED | `e0de94272a4d326235443aa99044472800d89ab5` |

`#572` (answer-position bias) was closed as superseded — landed via `#574` / `#580`.

---

## Confirmed defect fixed after #583

| ID | Class | Finding | Action |
|----|-------|---------|--------|
| D-CR1 | Content integrity | 899 / 1419 published rank items were exact cross-rank duplicate stems | **Fixed** — keep first occurrence AD II→D I; five-rank total **520** |
| D-CR2 | Misleading asset naming | Primary `guidePdfHref` pointed at `*_550_Questions_Answers.pdf` | **Fixed** — primary links use `*_N_Practice_Questions_Answers.pdf` |
| D-CR3 | Docs drift | Release verification still claimed 259 rank items / HEAD `e240fa4a` | **Fixed** — this document |
| D-CR4 | Loader hygiene | `publicationStatus` retired/draft not filtered | **Fixed** — practice pools only `published_practice` (or unset) |

---

## Honest published inventory (after cross-rank dedupe)

| Rank | Distinct | MCQ | True/False | Gap to 550 |
|------|---------:|----:|-----------:|-----------:|
| AD II | 295 | 241 | 54 | 255 |
| AD I | 87 | 78 | 9 | 463 |
| Deputy Director | 52 | 43 | 9 | 498 |
| Director II | 40 | 31 | 9 | 510 |
| Director I | 46 | 37 | 9 | 504 |

**Five-rank total:** 520 of 2,750 target (gap 2,230).  
**Verified:** 0 human-verified in rank banks (all `pending_review` / SOURCE ANSWER — REVIEW REQUIRED).  
**Not claimed:** official GES papers; 550 unique per rank.

Primary downloads (honest filenames):

- `/downloads/gigalearn/promotion-guides/GigaLearn_AD_II_295_Practice_Questions_Answers.pdf`
- `/downloads/gigalearn/promotion-guides/GigaLearn_AD_I_87_Practice_Questions_Answers.pdf`
- `/downloads/gigalearn/promotion-guides/GigaLearn_DD_52_Practice_Questions_Answers.pdf`
- `/downloads/gigalearn/promotion-guides/GigaLearn_D_II_40_Practice_Questions_Answers.pdf`
- `/downloads/gigalearn/promotion-guides/GigaLearn_D_I_46_Practice_Questions_Answers.pdf`
- `/downloads/gigalearn/promotion-guides/GigaLearn_Teacher_Promotion_Practice_Guides.zip`

`*_550_Questions_Answers.pdf` aliases remain byte-identical for old bookmarks and are **not** a claim of 550 distinct questions.

---

## Automated coverage

| Suite | Focus |
|-------|--------|
| `promotionBankQuality.test.ts` | Schema, cross-rank uniqueness, shuffle grading, entitlements, PDF/ZIP hrefs |
| `promotionRankBanks.test.ts` | Honest counts + free clamp |
| `promotionTrueFalse.test.ts` | TF import/grading/filters |
| `examAnswerPositionBias.test.ts` | Fisher–Yates + permutation scoring |
| `promotionGuidePdfs.test.ts` | Asset structure + ZIP |

---

## Blocked or unverified in production (unchanged)

| Check | Status | Why |
|-------|--------|-----|
| Authenticated start → answer → submit → restore → retry | **BLOCKED** | No authorized `GIGA3_E2E_*` credentials in agent env |
| Signed-in free vs premium stem access | **BLOCKED** | Same |

---

## Final release status

Pending merge/deploy of the cross-rank dedupe PR. Do not advertise 550 questions per rank or 2,750 verified items.
