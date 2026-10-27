# Teacher Promotion — root-cause report (22 Oct 2026, Africa/Accra)

## Production state

- PR #587 (`88c3eb81`) **merged and deployed** (Pages + Convex success at ~23:04 UTC).
- Live SW cache: `giga3-v62` (matches `main`). Stale SW alone does **not** explain the user report.

## Why the experience still feels broken

| User symptom | Actual cause |
|--------------|--------------|
| Artificial `(case ad-ii-472)` labels | PR #587 **added** case suffixes to uniquify near-duplicate stems (`stems_uniquified: 131`). Labels remain in `questionText` for learners. |
| No useful explanations | `optionExplanations` exist but are **templated** (“does not satisfy the question / weaker approach”). UI already renders them in learn mode when present. |
| Rewards not meaningful | `rewardCopy.ts` only shows praise strings (“EXCELLENT!”). No persisted XP/badge/progress grant on session complete. |
| No direct rank selection | “Teacher Promotion” CTA → `#teacher-promotion-centre` / free orientation / mixed `exam-teacher-promotion` bank. Rank banks exist **below the fold** with weak CTAs. |
| Not 550 per rank | Honest counts after dedupe: AD II 295, AD I 87, DD 52, D II 40, D I 46 (**520 total**, gap **2,230**). Prior “550” PDFs were ~84 unique stems + repeats. |

## Entry points (must all stay consistent)

1. `/gigalearn/exam/` → `ExamPracticeCentre` Teacher Promotion section  
2. `/gigalearn/exam/practice/` → orientation bank (not rank-specific)  
3. `/gigalearn/academy/tech/?course=exam-ad-ii` (etc.) → `TechHubPractice`  
4. `/gigalearn/academy/course/?slug=exam-ad-ii` → course shell  
5. Chat redirects `/teacher-promotion` → `/gigalearn/exam/promotion/`  
6. Academy catalogue `exam-teacher-promotion` → rank selector  

## Fix applied (this branch)

| Area | Change |
|------|--------|
| Navigation | Direct rank selector at `/gigalearn/exam/promotion/` with five Start Free Practice CTAs |
| Banks | 550 distinct original_practice items × 5 ranks (2,750); case labels removed; live counts from `meta.json` |
| Explanations | Per-option notes regenerated with option-specific reasons; learn mode reveals after submit; timed mode after finalize |
| Rewards | Server-graded practice XP via `finalizeSession` + `gigaLearnPracticeStats` (idempotent `rewardGrantedAt`) |
| Cache | SW bumped to `giga3-v63` |

## Verified vs claimed

Do **not** claim 550 verified official GES items. Target is 550 **distinct original practice** items per rank with keys + explanations, still labelled `pending_review` / non-official until human verification.
