# GigaLearn Academy Phase 1 — schema migration & rollback

## Additive tables (Convex)

| Table | Purpose |
|-------|---------|
| `gigaLearnAcademyCourses` | Author-created courses (draft/published/archived) |
| `gigaLearnAcademyEnrolments` | Consumer Academy enrolments + pathway resume |

Built-in catalogue courses remain in `web/lib/gigalearn/academy/courseCatalog.ts` and do **not** require DB rows.

### Indexes

- `gigaLearnAcademyCourses`: `by_slug`, `by_status`, `by_status_category`, `by_author`
- `gigaLearnAcademyEnrolments`: `by_user`, `by_course`, `by_user_course`, `by_user_status`

### Untouched (must stay)

- `gigaLearnProgress` and its indexes/functions
- `orgEnrollments` / enterprise classroom tables
- `curriculumEngine` / media packs / practice question parsing

## Deploy

1. Merge branch after review.
2. Deploy Convex schema (`npx convex deploy` / CI) so new tables exist before clients enrol.
3. Deploy Cloudflare Pages for `/gigalearn/academy/` routes.

Until Convex is deployed, catalogue still renders from the built-in TypeScript catalogue via `listPublishedCourses` (builtin merge). Enrolment mutations require the new tables.

## Rollback

1. Stop publishing authored courses; set authored rows to `archived` if needed.
2. Remove or hide `/gigalearn/academy/` UI in a follow-up commit (do not drop tables with live enrolments without owner approval).
3. Tables may remain empty/unused — **do not drop** `gigaLearnAcademyEnrolments` without explicit approval (learner data).

## Entitlements

- `free` — signed-in session
- `credits` — active subscription **or** `user.credits >= creditCost` (no new payment flow; no silent credit capture on enrol in Phase 1)
- `subscription` — `isSubscriptionActive(...)`

Client-side UI labels are informational only; enrolment is enforced in `enrolInCourse`.

## Phase 2 — course-aware tutoring (additive)

- `getEnrolledTutorContext` verifies enrolment server-side before exposing approved lesson materials.
- `adaptiveLearning.tutorTurn` accepts optional `academyContext` (does **not** replace the action).
- Tutoring never calls `updatePathwayProgress` or `gigaLearnProgress` mutations.
- Deep link: `/gigalearn/?tab=tutor&academyCourse=<slug>&module=<id>&lesson=<id>`
- Depends on Phase 1 tables/enrolment being deployed for live course-aware turns; builtin catalogue materials still resolve when courses are builtin + learner is enrolled.
