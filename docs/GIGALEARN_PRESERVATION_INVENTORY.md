# GigaLearn preservation inventory (Phase 0)

**Date:** 2026-10-14  
**Branch:** `cursor/gigalearn-academy-preserve-161d`  
**Base:** `main` @ `eb7ce4c` (#514)  
**Rule:** Additive Academy upgrade only. Do not delete, replace, or reset existing GigaLearn features, content, or learner data.

This document is the pre-implementation baseline. Academy work must extend what is listed here; it must not compete with or erase it.

---

## 1. Product surface & routes

| Route | Implementation | Notes |
|-------|----------------|-------|
| `/gigalearn` | `web/app/(marketing)/gigalearn/page.tsx` → `GigaLearnPageRoot` → `GigaLearnClient` | Primary SPA shell (`ssr: false` client root; SSR SEO header + JsonLd) |
| SEO hubs (sitemap) | `web/public/sitemap-gigalearn.xml` | `/gigalearn/`, BECE/WASSCE/teachers/schools Ghana landings |
| Nav | `web/lib/navigation/primaryNav.ts` | Matches `/gigalearn` |
| Catalog | `web/lib/seo/productCatalog.ts` | Product card for GigaLearn |

**Query tabs / areas** (via `?tab=`): `student`, `teacher`, `create`, `parent`, `insight`, `tutor` plus legacy aliases (`homework`, `rhymes`, `workspace`, `studio`, `learn`, `library`, `my-learning`, `revision`, `insights`) resolved in `web/lib/gigalearn/sectionRouting.ts`.

**Naming note:** **Creator Academy** (`/marketplace`, `CreatorAcademySection`) is a separate marketplace PDF series — do not conflate with GigaLearn Academy.

**Phase 1 additive routes (do not replace hubs):** `/gigalearn/academy/`, `/gigalearn/academy/course/`, `/gigalearn/academy/my/`, `/gigalearn/academy/author/`. See `docs/GIGALEARN_ACADEMY_PHASE1_MIGRATION.md`.

---

## 2. Primary UX areas (must remain)

Defined in `web/lib/gigalearn/sections.ts` → hubs under `web/components/gigalearn/hubs/`:

1. **Student** — learn, practise, revise, library, early-years / discover media (`StudentHub`, `PracticeSession`, `RevisionCenter`, `ResourceLibrary`, `DiscoverHub`, …)
2. **Teacher** — Teacher Studio, lesson/assessment tools (`TeacherHub`, `TeacherStudio`, `TeacherInsights`)
3. **Create** — generation + Document Studio handoff (`CreateHub`, `CreationBuilder`, `CreationStudio`)
4. **Parent** — home support (`ParentHub`)
5. **Insight** — progress / mastery (`InsightHub`, `StudentDashboard`)
6. **AI Tutor** — adaptive tutoring (`TutorHub`, `AdaptiveTutor`)

Supporting UI (non-exhaustive): `GigaLearnHomeworkPanel`, `GigaLearnToolPanel`, `GigaLearnWorkspacePanel`, `FlashcardStudy`, `PracticeQuestionCard`, `OfflineLessonsPanel`, `OfflineLessonViewer`, `GigaRhymesPanel`, `LowerGradesConcrete`, `CurriculumSelector`, `MethodologyPicker`, `StudioContextBar`, `ItemViewer`, `EarlyYearsActivityPanel`.

---

## 3. Curriculum content (client-side — do not erase)

Source of truth is **TypeScript catalogs**, not Convex course rows:

| Module | Role |
|--------|------|
| `web/lib/gigalearn/curriculumEngine.ts` | Country → curriculum → level → subject hierarchy |
| `web/lib/gigalearn/curricula.ts` | Legacy `EXAM_BOARDS` / `SUBJECTS` / `EDUCATION_LEVELS` bridges |
| `web/lib/gigalearn/questions.ts` | Practice question parsing, grading, fallbacks |
| `web/lib/gigalearn/adaptiveQuestions.ts` | Adaptive practice helpers |
| `web/lib/gigalearn/flashcards.ts` | Flashcard helpers |
| `web/lib/gigalearn/offlineLessons.ts` | IndexedDB offline lesson packs |
| `web/lib/gigalearn/mediaLibrary/*` | Ghana KG2 / phase2 media catalogs + assets under `web/public/gigalearn/media/` |
| `web/lib/gigalearn/rhymes/*` | Rhyme library + progress |
| `convex/learnContent.ts` | Legacy learn page items (fruits/vegetables/animals/body) |

### Ghana curricula (engine IDs — preserve)

- Countries: `ghana` (available); `nigeria`, `kenya`, `uganda`, `tanzania`, `south-africa` (placeholders)
- Curricula: `gh-ccp` (Common Core Programme), `gh-shs` (SHS)
- Levels: `kg-1` … `kg-2`, `basic-1` … `basic-12` (JHS/SHS aliases)
- Exam boards (legacy): `bece`, `wassce`, `waec`, `primary`, `jhs`, `shs`, `university`
- Subjects include NaCCA ids (`english-language`, `mathematics`, `science`, …) plus **deprecated aliases** (`ict`, `coding`, `creative-arts`, …) that must keep resolving for saved profiles

### Media / multimedia

- Static packs: `web/public/gigalearn/media/ghana/kg2/`, `…/phase2/` (webp, mp4, mp3, svg storyboards)
- Offline media: `mediaLibrary/offlineMedia.ts`, IndexedDB `media_packs`
- Discover / player: `DiscoverHub`, `MediaItemPlayer`, `LearningImageCard`

---

## 4. AI tutoring & generation

| Capability | Client | Backend |
|------------|--------|---------|
| Studio / tool generation | `useGigaLearnGeneration`, `studioTools.ts`, `tools.ts` | `convex/gigalearnStudio.ts` → `generateContent` |
| Adaptive tutor turns | `AdaptiveTutor` | `convex/adaptiveLearning.ts` → `tutorTurn`, `markAnswer` |
| Credit safety | — | `creditReservations` via `tryReserveInternal` / `captureInternal` / `releaseInternal`; references `gigalearn:{toolId}:{requestId}` |
| Personas / modes | `personaMap.ts`, `methodologies.ts` | Mode map includes `gigalearn`, homework, book, etc. (`creditsConfig.ts`) |
| Creation / books | `creation/*`, Document Studio links | Book intake + credit reservation tests under `tests/gigalearn/` |
| Chat handoff | `chatHandoff.ts`, chat UI entry points | Chat modes / answer quality mention GigaLearn |

**Studio / learner tool IDs (preserve):**  
`lesson-generator`, `lesson-notes`, `quiz-generator`, `assignment-generator`, `worksheet-generator`, `assessment-generator`, `presentation-generator`, `video-script-generator`, `flashcard-generator`, `teaching-aid-generator`, `practical-activity-generator`, `bece-mock`, `topic-explainer`, `revision-guide`, `study-plan`, `practice-questions`, `exam-prep`, `homework-explain`, `class-activity`, `parent-summary`, `learning-tips`, `progress-report`, …

---

## 5. Quizzes, practice, question banks

- Interactive practice tools gated by `INTERACTIVE_PRACTICE_TOOL_IDS` in `questions.ts`
- UI: `PracticeSession`, `PracticeQuestionCard`, practice modes in `practiceModes.ts`
- Scoring / mastery: `mastery.ts`, `practiceGamification.ts`, `practiceRecommendations.ts`
- Session persistence: `practiceSessionStorage.ts` (localStorage)
- Fallback questions via `getPracticeFallbackQuestions` — do not remove without replacement that keeps offline practice working

---

## 6. Learner progress & enrolments

### Consumer GigaLearn progress (Convex)

**Table:** `gigaLearnProgress` (`convex/schema.ts`)

| Field | Purpose |
|-------|---------|
| `userId` | Session email |
| `topicKey` | Normalized topic key |
| `subject`, `curriculum` | Optional context |
| `weakness` | Weak area text when score &lt; 70 |
| `practiceCount` | Practice iterations |
| `lastScore`, `lastAssessedAt` | Latest assessment |
| `needsReassess` | Loop flag |
| `updatedAt` | Ordering |

**Indexes:** `by_user_topic` (`userId`, `topicKey`), `by_user_updated` (`userId`, `updatedAt`)

**Functions (`convex/gigaLearnProgress.ts`):**  
`listProgress` (query), `recordAssessment` (mutation), `recordPractice` (mutation), `recordAssessmentInternal` (internalMutation)

**Offline sync:** IndexedDB queue (`offlineProgressQueue.ts`, stores `progress_queue`) + `useGigaLearnOfflineProgressSync` → flush with `clientCreatedAt` stale-guard (`offlineProgressMerge.ts`).

### Client profile / local state (do not wipe)

- Profile key: `giga3_gigalearn_profile` (`profile.ts`) — used by production e2e
- Studio context: `studioContext.ts`
- Practice session + media progress localStorage keys
- IndexedDB: offline lessons / progress / media packs (`offlineLessons.ts`)

### Enterprise enrolments (separate org product — preserve)

Tables: `organizations`, `orgMembers`, `orgClasses`, `orgEnrollments`, `orgAssignments`, `orgAssignmentSubmissions`, `orgAuditLogs`, `orgUsageDaily`  
Functions: `enterpriseClassrooms.ts` (`listClasses`, `createClass`, `enrollStudent`, `listClassEnrollments`, …), `enterpriseAssignments.ts` (assignments, submissions, grading, `getStudentProgress`)

---

## 7. Related Convex / platform touchpoints

| Module | Role |
|--------|------|
| `learnContent.ts` | Static learn items + pagination constant |
| `adaptiveLearning.ts` | Tutor modes + AI tutor actions |
| `gigalearnStudio.ts` | Generation action + credits |
| `phase5Education.ts` / `phase6Education.ts` | Education expansion summaries (feature-gated) |
| `userLearning.ts` | Chat interest profile helpers (not GigaLearn courses) |
| `users` fields | e.g. `learningStreakDays` (optional) |
| `creditReservations` / `creditLogs` | Billing for generations |
| `gigaPersonas` / `aiModes` | Persona routing for tools |

**Prohibited without owner approval:** dropping any of the above tables/fields; mass-deleting `gigaLearnProgress` or `orgEnrollments`; resetting IndexedDB/localStorage for all users; replacing `/gigalearn` with an empty placeholder.

---

## 8. Existing tests (regression baseline)

Under `tests/gigalearn/` (unit/component) and `tests/e2e/production-gigalearn.spec.ts`:

- Platform, curriculum engine, methodologies, questions, practice, pronunciation, speech, offline sync/media, discover/KG2 visuals, creation/book credit safety, phase2/3 adaptive, etc.

**New lockfile test:** `tests/gigalearn/preservationBaseline.test.ts` — asserts primary areas, Ghana curriculum/level IDs, progress schema/index presence, Convex export names, and `/gigalearn` page wiring.

---

## 9. Additive Academy rules (for upcoming work)

1. Prefer new routes like `/gigalearn/academy/...` or additive tabs — **never** empty `/gigalearn`.
2. Schema: add optional fields / new tables; do not rename or drop `gigaLearnProgress` keys without migration + rollback plan + owner approval.
3. New courses must be **additional** rows/catalogs alongside existing Ghana CCP/SHS content and media packs.
4. Certifications (if added) must not overwrite practice scores or enrolments; link by userId/topicKey/courseId additively.
5. Reuse `gigalearnStudio`, progress APIs, curriculum engine, and hubs rather than forking a parallel learner stack.
6. Do not deploy until preservation regression suite + targeted Academy tests pass; production deploy only via normal CI after human merge.

---

## 10. Verification checklist (post-Academy implementation)

- [ ] `/gigalearn/` HTTP 200; six primary areas still navigate
- [ ] Ghana curricula / levels / subjects still selectable; legacy aliases resolve
- [ ] Practice / quiz / tutor generation still call existing Convex paths
- [ ] `gigaLearnProgress` rows for existing users unchanged by migrations
- [ ] Offline lesson + progress sync still works
- [ ] Media Discover / KG2 assets still load
- [ ] Enterprise enrolments/assignments unaffected
- [ ] New Academy courses/certs coexist without replacing old content
- [ ] `tests/gigalearn/preservationBaseline.test.ts` + existing suite green

If any checklist item cannot be verified, **stop** and request explicit owner approval before proceeding.
