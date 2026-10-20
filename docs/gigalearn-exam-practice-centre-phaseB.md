# GigaLearn Exam Practice Centre — Phase B

**Branch:** `cursor/gigalearn-exam-practice-centre-161d` (PR #549)  
**Scope:** Mobile-first landing + navigation only. No PDF import, schema, or assessment engine.

## Route

`/gigalearn/exam/` — `ExamPracticeCentre` inside `ConvexAppShell`.

## Sections

1. Hero — title + tagline  
2. **BECE Mock Examination Centre** — awaiting materials empty state  
3. **Ghana Teacher Promotion Practice** — levels + source inventory (not imported)  
4. **AI Study Tutor** — links to existing `?tab=tutor` / revision  
5. **My Performance** — `listProgress`, `listMyEnrolments`, `listMyAssessmentHistory`  
6. **Continue practising** — resume own Academy enrolment only  

## BECE empty state

Exact message: “BECE practice materials are being prepared.”  
`BECE_SUBJECTS_AVAILABLE` is empty for future subjects without redesign.  
No teacher-promotion content in the BECE card.

## Teacher promotion vs BECE

Separate cards and test IDs. Promotion shows Phase 0 source inventory with  
`source_provided_needs_review` / `partial_awaiting_verification` — not verified.  
AI practice CTAs explicitly labelled non-source.

## Destinations reused

`/gigalearn/?tab=learn|tutor|teacher|revision`, `/gigalearn/academy/*` (catalogue, my, assess).

## Nav

- AcademyChrome: Exam Practice link  
- GigaLearnClient: Exam Practice Centre button  
- Exam page nav: Academy / My courses / Assessments / AI Tutor  

## Out of scope

Question import, schema, grading/credit/certificate changes, timed mocks.

## Verification (Phase B)

| Check | Result |
|-------|--------|
| `vitest` examPracticeCentrePhaseB + academyPhase1 | **13/13 passed** |
| `web` lint | Pass (pre-existing warnings elsewhere) |
| Phase B `tsc` filter | No errors |
| `web` `npm run build` | **Success** — `/gigalearn/exam` |
| Mobile Playwright (390×844 on :3011) | BECE empty, promotion inventory, Academy nav |

**Merge / deploy:** not done.
