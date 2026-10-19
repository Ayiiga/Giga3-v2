# GigaLearn Academy + Exam Centre — Release Readiness

**Date:** 2026-10-19  
**Integration branch:** `cursor/gigalearn-academy-exam-integrate-161d`  
**Sources:** PR #548 (Academy Phase 1) + PR #549 (Exam Practice Phase B)

## PR status (as reviewed)

| PR | Branch | Tip | Base | Mergeable | CI (vitest) |
|----|--------|-----|------|-----------|-------------|
| [#548](https://github.com/Ayiiga/Giga3-v2/pull/548) | `cursor/gigalearn-academy-transform-phase0-161d` | `53ef7537` | `main` | CLEAN | SUCCESS |
| [#549](https://github.com/Ayiiga/Giga3-v2/pull/549) | `cursor/gigalearn-exam-practice-centre-161d` | `96fa4e04` | `main` | CLEAN | SUCCESS |

Both share merge-base `8751affa` (main). Neither merged/deployed at review time.

## Overlaps found

| File | Issue | Resolution on integration branch |
|------|--------|----------------------------------|
| `AcademyChrome.tsx` | Content conflict: Phase 1 Home/Courses/Practice nav vs Phase B Exam Practice link on old Catalogue nav | Keep Phase 1 nav; insert **one** Exam Practice link after Courses |
| `sitemap-gigalearn.xml` | Conflict: courses vs exam URLs | Keep **both** `/academy/courses/` and `/exam/` |

`GigaLearnClient.tsx` / `site.ts` only changed on #549 — clean merge.

## Integrity checks

- BECE subjects bank empty; no promotion content in BECE card.
- No exam question-bank schema.
- No grading/credit/certificate rule edits in either PR.
- Performance queries remain session-scoped (`listProgress`, enrolments, assessment history).

## Smallest safe merge plan (authorisation required)

**Do not merge until a human authorises.** Recommended order:

1. Merge **integration PR** (this branch) into `main` **or**  
   merge #548 first, then #549 only after #549 is updated to include the Chrome/sitemap resolution (do **not** merge #549 alone onto main after #548 without the fix — Exam Practice link would be lost / conflict).
2. Prefer **one** integration merge over two sequential conflict-prone merges.
3. After merge: Pages deploy workflow + hard-refresh / SW cache as usual. No Convex schema deploy required for these changes.
4. Do **not** enable auto-merge without green Pages/vitest on the integration head.

## Remaining limitations

- No BECE papers; Teacher Promotion bank not imported.
- Studio “available” links open hubs, not dedicated studio workspaces.
- Academy assessments still require `?course=`.
- Full Pages workflow / production E2E not claimed here unless run on the integration head.

## Integration head verification (post SEO fix)

| Check | Result |
|-------|--------|
| Vitest Academy + Exam + integration | **50/50** then **16/16** on recheck |
| Lint | Pass (pre-existing warnings elsewhere) |
| `npm run build` | Success — `/gigalearn/academy`, `/courses`, `/exam` |
| `npm run seo:audit` | **0 errors** (7 unrelated warnings) |
| CI subscription | Watching `cursor/gigalearn-academy-exam-integrate-161d` |

### Fixes on integration branch beyond merge resolution

- Duplicate `<h1>` on Academy/Exam pages removed (`ProductSeoHeader` owns H1).
- `generate-public-seo-sitemap.mjs` registers `/gigalearn/exam/` and `/gigalearn/academy/courses/`.

## Ready to merge?

| PR | Standalone merge onto current main? | Notes |
|----|-------------------------------------|-------|
| #548 | Yes for Academy-only | Missing Exam Practice link until #549 integrated |
| #549 | **No after #548** without Chrome fix | Conflicts with Phase 1 nav; would drop Exam Practice or Phase 1 structure |
| #550 (integration) | **Preferred** | Contains both + conflict resolution + SEO fixes |

**Authorisation required before merge.** Not deployed.

