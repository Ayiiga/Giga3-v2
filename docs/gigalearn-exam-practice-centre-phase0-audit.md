# GigaLearn Interactive Examination Practice Centre — Phase 0 Audit

**Date:** 2026-10-19  
**Branch:** `cursor/gigalearn-exam-practice-centre-161d` (from `main` @ `8751affa`)  
**Scope:** Repository + uploaded source-material classification only. No product rewrite. No question bank populated.

---

## 1. What was inspected

### Repository / GigaLearn stack

| Area | Location | Finding |
|------|----------|---------|
| App shell | `web/app/(marketing)/gigalearn/`, `GigaLearnClient.tsx` | Primary areas: student, teacher, create, parent, insight, tutor |
| Academy routes | `/gigalearn/academy/*` | Catalogue, course, my, assess, certificates, author, verify — **course-pathway UX**, not exam-practice centre |
| Question types / grading | `web/lib/gigalearn/questions.ts` | `mcq`, `true_false`, `short_answer`, `fill_blank`, `ordering`, `matching`, `poll`; `gradeAnswer`, `computePracticeScore` |
| Interactive practice tools | `studioTools.ts`, `INTERACTIVE_PRACTICE_TOOL_IDS` | Includes `practice-questions`, `exam-prep`, `bece-mock` — **AI-generated**, not a verified paper bank |
| Curriculum labels | `web/lib/gigalearn/curricula.ts` | `EXAM_BOARDS` includes `bece` / `wassce` as **labels**, not stored past papers |
| Progress | `convex/gigaLearnProgress.ts` + schema | Per-user topic practice scores (school/AI practice) |
| Academy assessments | `convex/gigaLearnAcademyAssessments.ts`, `gigaLearnAcademyAttempts` | Server-authoritative attempts, idempotency, objective / AI / instructor grading — **tied to course assessments**, not exam centres |
| Certificates / enrolments | Academy tables in `convex/schema.ts` | Pathway completion — keep separate from exam practice |
| Auth / credits | Existing session + credits | Reuse; no new payment system |
| BECE safety copy | `convex/gigalearnStudio.ts`, personas | Already warns: do not label AI output as official WAEC/BECE |

### Uploaded files (verified path)

All five PDFs were found under:

`/home/ubuntu/.cursor/projects/workspace/uploads/`

| File | Pages | Extractable text |
|------|------:|------------------|
| `2022_G.ES_CUPSULES_PROMOTION_APTITUDE_TEST_7TH_ONLINE_QUIZ_2883.pdf` | 10 | Yes (Google Forms score print) |
| `2025_Benito_Final_Super_Mock_ANSWERS_cb90.pdf` | 28 | Yes |
| `2026_PROMOTION_ADVERT_PS_TO_DD_18fe.pdf` | 2 | No text layer (scanned images; inspected visually) |
| `AD2_28TH_FEB_2023_QUESTIONS_AND_ANSWERS_d2cf.pdf` | 45 | Yes |
| `Solved-FINAL_FINAL_MOCK__AUGUST_-_2024_QUESTION_03b1.pdf` | 24 | Yes |

**Not present in uploads:** any file titled or identifiable as *Marks of a Movement* (Christian book). Workspace search found no such PDF. Rule retained: if it appears later, **do not** treat it as BECE or promotion exam content.

---

## 2. Source-material classification (verified)

### Summary

| Document | Category | Suitable for BECE Centre? | Suitable for Teacher Promotion Centre? |
|----------|----------|---------------------------|----------------------------------------|
| 2022 GES Capsules Promotion Aptitude Quiz | Teacher promotion practice (compiled quiz) | **No** | Yes (import after review) |
| 2025 Benito Final Super Mock (filename: ANSWERS) | Teacher promotion mock paper (+ fill-in Ans: on later pages) | **No** | Yes (primary mock candidate) |
| 2026 GES Promotion Advert PS→DD | Administrative advert / eligibility | **No** | Metadata only (ranks, cycle) — **not questions** |
| AD2 28 Feb 2023 Q&A | Teacher promotion aptitude Q+A (compiled) | **No** | Yes (Q + source-provided answers) |
| Solved Final Mock Aug 2024 | Teacher promotion mock (solved / answers in paper) | **No** | Yes |

**BECE materials available in this upload set: none.**  
No document title, instruction block, or subject structure matches BECE / JHS student papers. Mentions of “Basic”, “JHS”, “WAEC”, or “Movement” inside promotion papers refer to GES administration / education-system content, **not** BECE candidate papers.

### Per-file notes

1. **2022 Capsules Promotion Aptitude Test**  
   - Title: “2022 G.ES CUPSULES PROMOTION APTITUDE TEST 7TH ONLINE QUIZ”.  
   - Google Forms scored view (`Total points 29/30`).  
   - Topics: education structure years, labour commission, GES/Public Services Commission, etc.  
   - **Answer status:** candidate score sheet shows marked selections; treat as **source-provided / needs review** before publishing as verified keys. Not an official WAEC paper.

2. **2025 Benito Final Super Mock**  
   - Header: Ghana Education Service promotion to Deputy Director / AD I / AD II / Principal Superintendent — December 2025.  
   - Sections: MCQ, True/False, Fill-in (DD applicants). ~150+ numbered items.  
   - Filename says `ANSWERS`; body is largely the **question paper**, with **inline `Ans:`** on Section C fill-ins. No separate clean MCQ answer-key table extracted.  
   - **Answer status:** fill-ins have source answers; MCQ keys **not verified** from a separate key sheet in this file — flag `awaiting_verification` unless a matching key is supplied.

3. **2026 Promotion Advert (PS to DD)**  
   - Scanned GES HQ letter (Ref. GES/HQ/DG/495/2026), invite for promotion to DD / AD I / AD II / Principal Superintendent.  
   - Application window / portal metadata only.  
   - **Use:** inform supported **promotion-level labels** in UI; do **not** import as questions.

4. **AD2 28 Feb 2023 Questions and Answers**  
   - “PROMOTION APTITUDE TEST EXAMINATION QUESTIONS AND ANSWERS” compiled by Henry Boateng.  
   - Explicit `Answer.` lines (~29+) alongside MCQs / T-F.  
   - **Answer status:** `source_provided` — still require human review before `verified`.

5. **Solved Final Final Mock August 2024**  
   - GES promotion to PS / AD I / AD II / DD (18 Aug 2024).  
   - Solved paper: answers appear in/alongside questions (esp. later sections).  
   - **Answer status:** `source_provided` / mixed clarity — review before verification.

### “Marks of a Movement”

User instruction: Christian book, **not** BECE. **Not found** among the five uploaded PDFs. No action other than exclusion rule.

---

## 3. Reusable building blocks (do not rebuild)

| Capability | Reuse |
|------------|--------|
| Question model + client grading helpers | `web/lib/gigalearn/questions.ts` |
| Server attempt lifecycle / idempotency patterns | `gigaLearnAcademyAttempts` + `gigaLearnAcademyAssessments.ts` (pattern only; new exam attempts should not overload course assessments) |
| AI Tutor | Existing Adaptive Tutor / studio tools / personas |
| Credits & sessions | Existing Convex auth + credits |
| Curriculum subject labels | `curricula.ts` / concrete subjects — for BECE **when** papers exist |
| Marketing shell / violet branding | Existing GigaLearn marketing layout + `gigalearn-stable` |
| Anti “fake official paper” copy | Keep and extend to exam centre UI |

**Gap:** There is **no** durable question-bank table with provenance, verification status, exam category (`bece` vs `teacher_promotion`), or reviewed import workflow. Academy assessments embed questions in catalogue JSON — unsuitable as the long-term exam bank.

---

## 4. Product direction confirmation

- Academy today = **structured courses + pathway assessments** (risk of looking like a course catalogue).  
- Exam Practice Centre must be a **first-class practice/mock UI** with two centres:  
  1. **BECE Mock Examination Centre** — infrastructure + empty/awaiting state until verified BECE sources arrive.  
  2. **Ghana Teacher Promotion Practice Centre** — can be fed from the four promotion question sources after import review.  
- Do **not** fill BECE with teacher-promotion items.  
- Do **not** label any imported item as official WAEC/BECE/GES exam unless provenance is verified.

---

## 5. Smallest safe implementation plan

### Phase B (next — landing only, no mass import)

Ship a mobile-first **Examination Practice Centre** landing under GigaLearn (e.g. `/gigalearn/exam` or Academy home redesign that **leads with practice**, not course cards):

1. Hero: GigaLearn Academy + tagline + authenticated welcome.  
2. Card: **BECE Mock Examination Centre** — CTAs present; subjects/list show **awaiting source material** empty state (no fabricated questions).  
3. Card: **Ghana Teacher Promotion Practice** — CTAs; promotion levels aligned to advert ranks (DD, AD I, AD II, PS) as **labels**; practice buttons disabled or “coming after review” until Phase C publishes a bank.  
4. Card: **AI Study Tutor** — deep-link existing tutor modes (explain / similar question / revise).  
5. Card: **My Performance** — wire to real queries only; empty states if no exam attempts yet (do not invent stats).  
6. Card: **Continue practising** — placeholder until attempts exist.  
7. Preserve global nav; no new payment system; no schema destruction.

**Out of Phase B:** PDF import, OCR pipeline, live timed mocks, publishing questions.

### Phase C (question bank + reviewed import)

- Additive Convex tables (or carefully extended schema) for questions, sources, verification status, exam category.  
- Import pipeline: extract → map options/keys → provenance → **admin review screen** → publish.  
- Seed **Teacher Promotion** only from Capsules / Benito / AD2 / Aug 2024 after review.  
- Mark uncertain MCQ keys `awaiting_verification`; exclude from definitive accuracy until resolved.  
- BECE bank remains empty/awaiting.

### Phase D–E

- Free practice + timed mock UI reusing grading helpers + server attempt validation.  
- Results, mistake review, no invented keys.

### Phase F–G

- AI Tutor explanations with verified vs AI-generated labels.  
- Performance dashboard from real attempts.  
- Admin review, tests, PWA/accessibility, release checks.

---

## 6. Risks and constraints

| Risk | Mitigation |
|------|------------|
| Copyright / redistribution of third-party mocks (Benito, Capsules, Boateng compilations) | Store provenance; publish only with permission; prefer practice paraphrases if rights unclear; legal review before public bank |
| Filename “ANSWERS” ≠ complete answer key | Per-item verification flags |
| Scanned advert | Metadata only; OCR optional later |
| Confusing Academy courses with Exam Centre | Separate nav entry + home that privileges practice centres |
| BECE empty state disappointment | Clear copy + tutor/practice generators as interim AI practice (labelled non-official) |

---

## 7. Phase 0 deliverables status

| Item | Status |
|------|--------|
| Repo / GigaLearn audit | Done |
| Upload path verification | Done (5 PDFs) |
| BECE vs Teacher Promotion classification | Done — **0 BECE**, **4 promotion question sources**, **1 advert** |
| Marks of a Movement | Not in uploads; exclusion rule documented |
| Answer-key / marking notes | Done at source level (see §2) |
| Smallest safe next step | Phase B landing (above) |
| Phase B landing | See `docs/gigalearn-exam-practice-centre-phaseB.md` — `/gigalearn/exam/` |
| Implementation / import / deploy | Landing only; **no import / merge / deploy** |

---

## 8. Explicit non-claims

- No questions imported or published.  
- No BECE papers claimed present.  
- No performance metrics invented.  
- No merge or production deploy of Exam Centre features in this phase.
