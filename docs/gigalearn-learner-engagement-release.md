# GigaLearn — Learner functionality & measurable engagement

**Branch:** `cursor/gigalearn-learner-engagement-161d`  
**Date:** 2026-10-19  
**Priority:** Functionality and measurable engagement — **not** a visual redesign.

## Goals

1. Learners can act without dead ends (especially `/academy/assess/` without `?course=`).
2. Signed-in learners see **server-verified next steps** (resume, unlocked assessment, revise weakness).
3. Product can measure GigaLearn engagement via existing `platformCounters` + DAU activity — **no new schema**.

## Deliverables

| Item | Behaviour |
|------|-----------|
| Assessment hub picker | Lists active enrolments when `?course=` missing |
| `listMyNextSteps` | Session query: resume courses, next unlocked assessment, practice weaknesses |
| Engagement counters | `gigalearn.*` keys on enrol / pathway / assessment submit + CTA opens |
| Exam → Teacher hub | `?tab=teacher&intent=promotion-practice` + intent banner; events recorded |
| Checklist | `academy_next_step` → `/gigalearn/academy/` |

## Integrity

- BECE awaiting-sources unchanged; no invented papers.
- No grading / credit / certificate rule changes.
- No MoMo or third-party payment UI.
- No visual redesign of Academy/Exam shells.

## Out of scope

Charts, XP invention, BECE bank import, new Convex tables, another colour pass.
