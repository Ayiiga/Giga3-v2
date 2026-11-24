# GigaLearn 2076 audit and release plan

Audit baseline: Ayiiga/Giga3-v2 main at c94fc7ebf76d9af74444fa34a488809064f53bfd, 24 November 2026. Scope: GigaLearn within Giga3 AI, GIGA 3 ENTERPRISE.

## Existing routes and implementation

| Surface | Entry points and data | Audit finding |
|---|---|---|
| Learn | `/gigalearn/`, `GigaLearnPageRoot`, `GigaLearnClient`, `sections.ts`, `sectionRouting.ts` | One workspace for Student, Teacher, Create, Parent, Insight and Tutor. Preserve the global navigation and legacy query-string routes. |
| Early Years and Discover | `StudentHub`, `LowerGradesConcrete`, `EarlyYearsActivityPanel`, `DiscoverHub`, `MediaItemPlayer`, `convex/learnContent.ts` | Concrete cards and counting still lean on emojis. The generated text activity and structured media player serve different needs. Keep reviewed activities usable without a generation request. |
| Academy | `/gigalearn/academy/`, ten route entry files, `components/gigalearn/academy/`, `lib/gigalearn/academy/`, separately packaged Academy workspace | Preserve existing courses, enrolment, assessments, certificates and progress. Exercise both the Next.js and static Academy entry points where routes overlap. |
| Practice | `/gigalearn/exam/` and BECE, WASSCE, Promotion and Practice routes, plus `/gigalearn/academy/tech/` | Free/local quiz and authenticated Convex sessions are separate. Exercise both. Shared server grading in `convex/gigaLearnTechBanks.ts` maps shuffled display indices to original choices. |
| Curriculum and resources | `curriculumEngine.ts`, `CurriculumSelector`, `/gigalearn/resources/`, `ResourceLibrary` | Historical `gh-ccp` groups KG through JHS. Keep the saved ID compatible and correct the user-facing umbrella label. Phase-specific subject and indicator records require official document review. |
| Images and audio | `lib/gigalearn/mediaLibrary/`, `web/public/gigalearn/media/ghana/`, speech synthesis and rhyme modules | The generated KG2 manifest contains 41 records. The presence of a record proves neither educational review nor that it is a real photograph. Inspect the asset, rights, accessible description and mobile playback before publishing each release pack. |
| Offline | `OfflineLessonsPanel`, `offlineLessons.ts`, `offlineMedia.ts`, `offlineProgressQueue.ts`, `offlineProgressSync.ts`, `web/public/sw.js` | IndexedDB downloads and progress sync exist. Verify the installed PWA cold-start, missing and interrupted media, storage pressure, account isolation and repeated reconnection on physical phones. |
| Personalisation and adult support | `AdaptiveTutor`, `RevisionCenter`, `ParentHub`, `TeacherHub`, `TeacherInsights`, `convex/adaptiveLearning.ts` | Existing interfaces and state can be reused. Establish authenticated child/account-role behavior before enabling new tutoring, analytics or sharing for learners. |

## Priority findings

1. PR #763 is an open draft. GitHub Actions run 44091198542 passed Vitest, backend TypeScript, web TypeScript syntax and static build. Four focused suites at PR head 5b40eb3803071834e0be7d2e151ff31997d950a0 passed 37 tests locally. Baseline main already contains the guarded optimistic save, rollback and a visible Saving label. The original wrong-choice symptom still needs physical Android reproduction and authenticated verification in all three exam modes. Immediate feedback in the authenticated UI depends on server acknowledgement, while tap selection can render before it.
2. The early-years catalog conflated a ball with a circle and a box with a square, including in audio variants. The first change corrects the examples and adds a three-question physical-object exercise with explanatory feedback and a transfer activity.
3. The first change directs the Crèche screen to supervised caregiver activities and removes retired creator handoffs from the library and teacher studio. The existing Teacher Studio narration action now downloads text.
4. The references show Common Core beside KG and primary, provide streak prompts and place WASSCE alongside JHS. Use the references for visual direction. The production specifications use phase-appropriate curriculum, age-appropriate rewards and secondary-only WASSCE pathways.
5. NaCCA identifies KG as Phase 1, B1–3 as Phase 2, B4–6 as Phase 3, JHS as Phase 4 and SHS as Phase 5. NaCCA says Our World Our People remains a standalone area in KG and its primary content is integrated in related subjects from 2024/25. The broader grade-by-grade subject audit is pending. [NaCCA curriculum overview](https://nacca.gov.gh/curriculum/)
6. Use the supplied sink-or-float visual to guide the activity layout. Explain floating with density and displaced water at the appropriate grade. Separate simulated results from observations recorded during a supervised physical activity.

## Implementation sequence and release gates

| Stage | Deliverables | Evidence needed |
|---|---|---|
| 1. Reliability and early-years corrections | Authentication-safe exam selection audit, supervisor-facing Crèche, corrected shape teaching and release regression baseline | Unit and browser tests for fast taps, rejected saves, correct/incorrect feedback and score reconciliation. Authenticated BECE, WASSCE and Promotion on Tecno Spark 10 Pro. |
| 2. Four-world activity architecture | World navigation, curriculum map, reusable audio, interaction and assessment components. First complete literacy, maths and science activities with physical missions and level-appropriate feedback | Enter each activity from Learn, complete using touch and keyboard, resume progress, use in light/dark and reduced motion, confirm tags and accessibility. Preserve approved Learn destinations. |
| 3. Curriculum and resource expansion | Grade-specific pathways, labs, games, writing, open tasks, rubrics, real photographs and reviewed audio. Preserve target counts as backlog | Verify license, source, educator review, language review, duplicates, file sizes and published counts. Verify each strand, sub-strand, standard and indicator against the correct official document. Use legally available past questions and label original practice. |
| 4. Mastery, access and offline | Adaptive review, transfer tasks, child-safe tutoring, teacher/parent insight, versioned downloadable packs and safe progress sync | Role and cross-account tests, age-gated tutoring checks, offline cold start, interruption/resume, reconnect without duplicated attempts, audio playback and low-data Android layout. |
| 5. Pilot and release | Supervised 8–12 week evaluation and evidence-led release | Teacher-approved baseline/post-assessments, 7- and 30-day recall, unfamiliar problems, practical application, voluntary participation, satisfaction, accessibility and device data. Claims require supporting outcomes. Record GitHub CI, static export, Cloudflare Pages deploy, and production PWA/installed-Android verification against the same release commit. |

The current build cannot stand in for the authenticated physical-device gate. Record the release ID, phone and PWA/Android version for each test. For a shuffled question, capture the tapped letter and text, the immediate highlight, the confirmed choice and explanation, and the final score. Repeat for a wrong answer, rapid double tap, slow response, failed save, resume, and Previous/Next. Ensure the tested versions include all platform-preservation checks and the official curricular reviews.

Literacy reference: [IES What Works Clearinghouse foundational reading guide](https://ies.ed.gov/ncee/WWC/PracticeGuide/21). The guide supports linking speech sounds to letters, decoding and reading connected text. Learning outcomes for GigaLearn require separate pilot evidence.
