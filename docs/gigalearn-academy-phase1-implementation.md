# GigaLearn Academy — Phase 1 Implementation Notes

**Branch:** `cursor/gigalearn-academy-transform-phase0-161d` (PR #548)  
**Scope:** Landing page + navigation only. No assessment engine, schema, or certificate changes.

## Tagline

Learn by Doing. Build with AI. Create the Future.

## UI sections implemented

1. **Hero** — welcome + tagline + CTAs to Practice Centre and Existing Academy.
2. **Personal learning summary** — `listMyEnrolments`, `listMyAssessmentHistory`, `listMyCertificates`; sign-in, loading, and empty states; no invented streaks/scores.
3. **Practice Centre** — links to `/gigalearn/academy/assess/`, My courses, Student practice (`?tab=learn`), AI Tutor (`?tab=tutor`).
4. **Learning Studios** — seven cards from `learningStudios.ts`.
5. **Existing Academy** — full searchable catalogue embedded on home; dedicated page at `/gigalearn/academy/courses/`.

## Files changed

| Path | Role |
|------|------|
| `web/lib/gigalearn/academy/learningStudios.ts` | Studio directory + tagline |
| `web/components/gigalearn/academy/AcademyHome.tsx` | New landing hub |
| `web/components/gigalearn/academy/AcademyCourseCatalogueBody.tsx` | Shared catalogue list |
| `web/components/gigalearn/academy/AcademyCatalogue.tsx` | Thin catalogue page shell |
| `web/components/gigalearn/academy/AcademyChrome.tsx` | Home / Courses / Practice nav |
| `web/components/gigalearn/academy/AcademyPageRoots.tsx` | `AcademyHomeRoot` |
| `web/components/gigalearn/academy/AcademyAssessmentPanel.tsx` | `active="practice"`; catalogue link |
| `web/app/(marketing)/gigalearn/academy/page.tsx` | Renders home hub + SEO |
| `web/app/(marketing)/gigalearn/academy/courses/page.tsx` | Dedicated catalogue route |
| `web/public/sitemap-gigalearn.xml` | Courses URL |
| `tests/gigalearn/academyTransformPhase1Landing.test.ts` | Landing/nav tests |
| `tests/gigalearn/academyPhase1.test.ts` | Catalogue body path update |
| `docs/gigalearn-academy-phase0-audit.md` | (prior) |
| `docs/gigalearn-academy-phase1-implementation.md` | This note |

## Routes preserved

`/gigalearn/academy/`, `/courses/`, `/course/`, `/my/`, `/assess/`, `/certificates/`, `/verify/`, `/author/`.

## Studio destinations

| Studio | Status | Destination |
|--------|--------|-------------|
| GigaAI Studio | Available | `/gigalearn/?tab=tutor` |
| GigaCoding Studio | Available | `/gigalearn/?tab=learn` |
| GigaInnovation Studio | Available | `/gigalearn/?tab=create` |
| GigaWeb / GigaPWA / GigaApp / GigaRobotics | Planned | No CTA (coming soon) |

## Reused backend

No new Convex functions or schema. Summary uses existing session-scoped queries only.

## Out of scope (unchanged)

Grading, answer keys, credits, certificate eligibility, project schema, robotics sim, deleting builtin courses.

## Tests executed

| Check | Result |
|-------|--------|
| `vitest` Academy suites (Phase1 + transform landing + tutor/assess/certs) | **39/39 passed** |
| `web` `npm run lint` | Pass (pre-existing warnings elsewhere) |
| Phase 1 files via `tsc --noEmit` | No errors in new Academy files |
| `web` `npm run build` | **Success** — includes `/gigalearn/academy/courses` |
| Mobile Playwright walkthrough (390×844) | Home → studios → Practice → Courses |

## Known limitations

- Assessments still require a `?course=` slug (existing behaviour).
- Studio “available” links open hubs, not studio-specific workspaces (those do not exist yet).
- Not merged or deployed in this phase.
