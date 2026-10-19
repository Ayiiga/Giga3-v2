# GigaLearn Academy — Phase 0 Audit

**Branch:** `cursor/gigalearn-academy-transform-phase0-161d`  
**Base:** `main`  
**Status:** Audit complete — no Academy product rewrite in this phase.

Full agent artifact (same content): see cloud run artifacts `gigalearn-academy-phase0-audit.md` if present.

## Current Academy (preserve)

| Path | Purpose |
|------|---------|
| `/gigalearn/academy/` | Course catalogue landing |
| `/gigalearn/academy/course/` | Detail, enrol, resume |
| `/gigalearn/academy/my/` | Enrolments |
| `/gigalearn/academy/assess/` | Server-graded assessments |
| `/gigalearn/academy/certificates/` | Issued certificates |
| `/gigalearn/academy/verify/` | Public verification |
| `/gigalearn/academy/author/` | Authoring (invite roles) |

Backend: `convex/gigaLearnAcademy.ts`, `gigaLearnAcademyAssessments.ts`, `gigaLearnAcademyCertificates.ts`.  
Question types already in `web/lib/gigalearn/questions.ts` (mcq, true_false, fill_blank, ordering, matching, short_answer, poll).  
AI Tutor: reuse `AdaptiveTutor` / TutorHub — do not fork.

Builtin pathways are exam/early-years/teacher focused and **link into** existing GigaLearn tools (not a second curriculum). Certificates are server-authoritative.

## Gaps vs “Learn by Doing” studios vision

No Learning Studios IA, Practice Centre hub, Today’s Challenge, My Projects/portfolio, or robotics/compiler integrations. Policy already has optional `requireProjectApproved` but no project product yet.

## Smallest safe Phase 1

Redesign **landing + nav only**:

1. Welcome + tagline on Academy home.
2. Personal strip from **real** enrolment/attempt/certificate data (honest empty states).
3. Studios directory cards (deep-links / stubs — no fake progress).
4. Practice Centre entry → existing assess + practice tools.
5. Keep full existing catalogue under “Existing Academy”.
6. Extend `AcademyChrome` nav without removing My courses / Certificates / Verify / Author.

**Out of Phase 1:** new assessment engine, project schema, robotics sim, certificate/credit rule changes, deleting builtin courses.

## Next step

Implement Phase 1 on this branch after plan approval; keep Phases 2–6 incremental.
