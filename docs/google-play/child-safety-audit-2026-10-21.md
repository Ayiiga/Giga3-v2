# Child-safety audit — Giga3 AI (2026-10-21)

**Scope:** Repository inspection + implemented controls on branch `cursor/child-safety-play-release-161d`.  
**Audience fact:** Product includes education for children under 13 (GigaLearn) and social features for older users.  
**Compliance claim:** This document does **not** certify COPPA, GDPR-K, or Google Play Families Policy compliance.

---

## Confirmed protections (before this pass)

| Area | Status | Evidence |
|------|--------|----------|
| Auth / sessions | Present | Password + verified JWT sessions; bare-email session stubs disabled (`authPasswordActions`, `users.createUser` stub) |
| Account suspension | Present | `users.accountStatus` + admin suspend |
| DM block / report | Present | `socialDmBlocks`, `socialDmReports`; server checks in `gigaSocialDm.ts` |
| Feedback / content_report | Partial | `platformFeedback` types include `content_report` (phase5-gated) |
| Account deletion | Present | `accountDeletion.deleteMyAccount` |
| Image gen safety checker | Partial | fal `enable_safety_checker` defaults on |
| GigaLearn age UI bands | Curriculum only | `web/lib/gigalearn/ageUi.ts` — pedagogical UX, **not** account age gate |
| Privacy “children” clause | Stale | Previously said app “not intended for children” while education targets them |

## Missing / high risk (before this pass)

1. **No account age attestation** — no `birthYear` / age category on `users`; no server gate for under-13 social access.
2. **GigaSocial UGC open to all signed-in users** — posts, comments, likes, follows, profiles with no age restriction.
3. **Adult–minor DM risk** when DM flag is on — no age gate on `sendMessage` / `acceptRequest`.
4. **No dedicated post/comment report queue** — only DM reports + generic feedback.
5. **AI chat** — no child system addendum; no input/output safety scan for CSE/grooming/self-harm; no always-on “unsafe AI” report type.
6. **Privacy disclosure mismatch** with under-13 education audience.
7. **No parental consent workflow** (email consent token, etc.) — still an outstanding policy/product gap for full Families / COPPA-style compliance.

## Implemented in this pass

| Control | Where | Enforcement |
|---------|-------|-------------|
| Birth month+year attestation | `childSafety.setAgeAttestation`, `AgeGateModal` | Required UI for signed-in users; stored on `users` |
| Age categories unknown/child/teen/adult | `childSafetyPolicy.ts` | Pure + server helpers |
| Block social UGC / follow / DM for child+unknown | `gigaSocial.ts`, `gigaSocialDm.ts` | Server `assertChildSafetyFeature` |
| Social content report queue | `socialContentReports` + `reportSocialContent` | Server insert; human review (not auto-delete) |
| AI input block (severe) | `chatMessaging.acceptMessage` | Fail closed; refusal message |
| Child AI system addendum | `chatReplyWorker`, `chatConversationalCore` | Server-only; not returned to clients |
| AI output scan | Same workers | Replace unsafe output with fallback |
| Strip adult personas for child/unknown | `chatMessaging` | `personaId` cleared |
| Report unsafe AI | Feedback type `unsafe_ai` | Always available when signed in |
| Privacy children section updated | `web/lib/legal/content.ts` | Describes controls; no compliance certification |

## Remaining risks / owner actions

- Parental consent / notice for under-13 beyond self-attestation (legal review).
- Human moderation staffing for `socialContentReports` / `unsafe_ai` / DM reports.
- Feed **read** path still visible to under-13 if they navigate to GigaSocial URLs (writes blocked); consider read-hide UX.
- Third-party AI provider data processing agreements for children’s data.
- Play Console: Data Safety, target audience, Families Policy (if declaring under-13), UGC declarations — **owner only**.
- Physical-device TWA verification after DAL deploy.

## Affected files (primary)

- `convex/childSafetyPolicy.ts`, `convex/childSafety.ts`
- `convex/schema.ts`
- `convex/gigaSocial.ts`, `convex/gigaSocialDm.ts`
- `convex/chatMessaging.ts`, `convex/chatReplyWorker.ts`, `convex/chatConversationalCore.ts`
- `convex/platformFeedback.ts`
- `web/components/safety/*`, `web/components/pwa/DeferredPwaChrome.tsx`
- `web/components/feedback/FeedbackModal.tsx`, `web/lib/legal/content.ts`
- `tests/security/childSafetyPolicy.test.ts`
