# Giga3 AI — Production Release Notes

**Release SHA:** `c52cecc03e7b6f7072940ed8625ed49806a25877`  
**Generated:** 2026-09-21 (UTC)  
**Production URL:** https://www.giga3ai.com  
**Repository:** https://github.com/Ayiiga/Giga3-v2  
**Evidence policy:** All claims below cite collected artifacts; unverified items are labeled explicitly.

---

## 1. Executive Summary

| Item | PR #412 (primary release) | PR #411 (prior release, separate) |
|------|---------------------------|-----------------------------------|
| **Title** | Fix chat user-context preservation when news retrieval fails | fix(chat): mobile voice selector + release-410 runtime/E2E verification |
| **PR URL** | https://github.com/Ayiiga/Giga3-v2/pull/412 | https://github.com/Ayiiga/Giga3-v2/pull/411 |
| **Branch head (pre-merge)** | `c55936ff460bd2ceb010127315fcfc58854f9b7d` | `e551f32a5942dc9c6d55e03b2b4e8f73a91d292c` |
| **Merge commit on `main`** | `c52cecc03e7b6f7072940ed8625ed49806a25877` | `e883226dcc5bb3f8702a48d3a64bd0c4d99a2ac4` |
| **Merged** | Yes — 2026-09-21T10:12:14Z | Yes — 2026-09-21T08:09:28Z |
| **Scope** | Convex backend — user-context / news routing | Frontend — mobile voice selector + E2E |
| **Convex deployed** | Yes — run `35587481367` @ `c52cecc` | Yes — run `35576429969` @ `e883226` |
| **Pages deployed** | Yes — run `35587481466` @ `c52cecc` (rebuild; no `web/` code changes in #412) | Yes — run `35576429901` @ `e883226` |
| **Production verification** | **PASS — PRODUCTION VERIFIED** (MTN + BOLA via Convex API) | **PARTIAL** (auth E2E blocked) |

**Current `main` tip (verified):**

```
c52cecc03e7b6f7072940ed8625ed49806a25877 Fix chat user-context preservation when news retrieval fails (#412)
```

---

## 2. Release Integrity

### Commit chain (`origin/main`, newest first)

| SHA | Message |
|-----|---------|
| `c52cecc` | Fix chat user-context preservation when news retrieval fails (#412) |
| `e883226` | fix(chat): mobile voice selector + release-410 runtime/E2E verification (#411) |
| `4afff6c` | feat(chat): fresh chat surface, premium answer blocks, unified voice layer (#410) |
| `b6501b2` | Chat interface answer blocks (#409) |
| `a341286` | fix(convex): remove heartbeat peak-concurrent write to platformStatsDaily (#407) |

### Deploy runs @ `c52cecc`

| Workflow | Run ID | Result | headSha |
|----------|--------|--------|---------|
| Deploy Convex backend | [35587481367](https://github.com/Ayiiga/Giga3-v2/actions/runs/35587481367) | success | `c52cecc03e7b6f7072940ed8625ed49806a25877` |
| Deploy to Cloudflare Pages | [35587481466](https://github.com/Ayiiga/Giga3-v2/actions/runs/35587481466) | success | `c52cecc03e7b6f7072940ed8625ed49806a25877` |
| CI — Unit & Security Tests | [35587481475](https://github.com/Ayiiga/Giga3-v2/actions/runs/35587481475) | success | `c52cecc03e7b6f7072940ed8625ed49806a25877` |

### Convex production identity

| Check | Result | Evidence |
|-------|--------|----------|
| Production Convex URL | `https://perfect-lark-521.convex.cloud` | `curl` chat HTML bootstrap + post-deploy API calls |
| URL unchanged | Yes | Same deployment name before/after #412 deploy |
| `userContextRouting.ts` on `main` | Present | `git show c52cecc:convex/newsEvidence/userContextRouting.ts` |
| Backend symbols in frontend bundle | Not expected | #412 is Convex-only; `userContextRouting` not in JS chunks |

### Frontend / Pages integrity @ `c52cecc`

| Check | Result | Evidence |
|-------|--------|----------|
| PWA cache version | `giga3-v6` | `curl -s https://www.giga3ai.com/sw.js \| grep CACHE_VERSION` |
| Production Convex bootstrap | `perfect-lark-521.convex.cloud` | Chat page HTML |
| Chunk SHA256 match (local build @ `c52cecc` vs production) | **MATCH** | See table below |

**SHA256 — shared chunks (local `web/out` build vs production):**

| Chunk | SHA256 (prod = local) | Match |
|-------|------------------------|-------|
| `2117-7490bc15788ef45c.js` | `913553b783973b7515f25100fc4de31b9c46245ca70dc191cb26742468ca3def` | YES |
| `fd9d1056-516d0703cfb2a43a.js` | `865cad64a44a0c49b5bdadd6c3e9a9a363f6943fb9a70efc1b6292ebab67276f` | YES |
| `1523-47f566e26e344f0b.js` | `f0d0f7c9c53d8152b8fbc736fdf01dd891c07babd965e589a1076f0fc62b41e6` | YES |

**Note:** Chunk `2889-f672a36acfc03a59.js` (PR #411 voice bundle at `e883226`) is **no longer referenced** on the production chat page after the `c52cecc` Pages redeploy. PR #411 voice UI string `chat-voice-language-bar` is present in production chunk `1523-47f566e26e344f0b.js` (verified by content scan).

### Automated gates @ `c52cecc` (local, 2026-09-21)

| Gate | Result | Evidence |
|------|--------|----------|
| Unit tests | **1216/1216 PASS** | `npm test` — 233 files, 17.85s |
| Build | **PASS** | `cd web && NEXT_PUBLIC_CONVEX_URL=https://perfect-lark-521.convex.cloud npm run build` |
| Lint | **PASS** (warnings only) | `cd web && npm run lint` — 5 pre-existing warnings |
| SEO audit | **PASS** | 0 errors, 2 warnings — `npm run seo:audit` |
| Playwright E2E | **5 PASS / 17 SKIPPED** | `npx playwright test tests/e2e/verified-release-410.spec.ts` — `GIGA3_E2E_EMAIL` not set |

---

## 3. Per-PR Sections

### PR #412 — User-context preservation when news retrieval fails

#### Baseline

| Field | Value |
|-------|-------|
| PR | https://github.com/Ayiiga/Giga3-v2/pull/412 |
| State | MERGED |
| Pre-merge head | `c55936ff460bd2ceb010127315fcfc58854f9b7d` |
| Merge commit | `c52cecc03e7b6f7072940ed8625ed49806a25877` |
| Merged at | 2026-09-21T10:12:14Z |
| Merge method | Squash (merge commits disallowed on repository) |

**Files changed (16):** `convex/answerQuality.ts`, `convex/chatReplyWorker.ts`, `convex/newsEvidence/pipeline.ts`, `convex/newsEvidence/postValidation.ts`, `convex/newsEvidence/userContextRouting.ts` (added), `convex/providerRouter.ts`, `convex/researchCapabilities.ts`, plus 9 test files.

#### Automated Tests

| Test suite | Result | Evidence |
|------------|--------|----------|
| Full unit suite | 1216/1216 PASS | `npm test` @ `c52cecc` |
| `userContextRouting.test.ts` | 10/10 PASS | Included in full suite |
| `pr412Integration.test.ts` | 31/31 PASS | Included in full suite |
| `mtnRoutingAudit.test.ts` | 1/1 PASS | Included in full suite |
| Build | PASS | Static export to `web/out` |
| Lint | PASS (warnings) | No new errors |
| CI @ merge | success | Run `35587481475` |

#### Production Tests

| Test | Result | Evidence |
|------|--------|----------|
| Chat loads (unauthenticated) | PASS | HTTP 200 `/chat/`; Playwright smoke |
| MTN paste — no generic retrieval failure | **PASS** | Post-deploy Convex API test; reply in ~3.2s; `genericFailure: false` |
| MTN paste — facts from user content | **PASS** | Reply includes GHS400,000, GHS200,000, 19 October 2026, categories |
| Explicit "user-provided" labeling | **PARTIAL** | `userProvidedLabel: false` in artifact; model used "Thank you for sharing…" + factual summary |
| `queryNeedsLiveWeb = false` | **INFERRED PASS** | Reply latency ~3–4s (no live-web research delay); routing tests pass locally |
| BOLA — User B cannot read User A conversation | **PASS** | User B `messages:listByConversation` on User A's `conversationId` → 0 messages |
| Credit / live-web rate limit | **UNVERIFIED** | No rate-limit counter inspection in post-deploy test |
| Console / network (browser) | **UNVERIFIED** | Post-deploy used Convex HTTP API, not browser DevTools |
| Playwright authenticated E2E | **BLOCKED** | `GIGA3_E2E_EMAIL` / `GIGA3_E2E_PASSWORD` not set |

**Post-deploy artifact:** `/opt/cursor/artifacts/pr412-post-deploy-report.json`

```json
{
  "convexUrl": "https://perfect-lark-521.convex.cloud",
  "mtnTest": { "genericFailure": false, "elapsedMs": 3215 },
  "bolaTest": { "userBMessageCount": 0, "passed": true },
  "overall": "PASS — PRODUCTION VERIFIED"
}
```

**MTN test fixture used:**

> MTN Ghana Heroes of Change Season 8 is open for nominations until 19 October 2026. The overall winner receives GHS400,000 and each category winner receives GHS200,000. Categories include Education, Health, Economic Empowerment, Sustainability and Digital Innovation. Nominate via the MTN Ghana website or MTN Service Centres. nominate your hero today!

#### Architecture audit (PR #412 only)

| Component | Role |
|-----------|------|
| `classifyInformationRequest()` | Authoritative mode: `answer_from_user_context`, `verify_user_content`, `retrieve_current_news`, `general` |
| `queryNeedsLiveWeb()` | Returns `false` for `answer_from_user_context` |
| `resolveResearchCapability()` | Returns `general` for user-context pastes |
| `shouldEnableWebSearch()` | Returns `false` when `detectAnswerFromUserContextIntent()` |
| `chatReplyWorker.ts` | Injects `USER_PROVIDED_CONTENT_GUIDANCE`; skips empty `newsEvidence` on user-context |
| `postValidation.ts` | `buildUserContextRecoveryAnswer()` when generic retrieval failure detected |

**Auth / scoping:** No new public queries exposing cross-user data. BOLA test passed (0 messages for unauthorized conversation access).

**External calls:** User-context mode reduces live-web invocations for pasted announcements.

#### PR #411 isolation (from #412 evidence)

| Check | Result |
|-------|--------|
| #411 production code in #412 diff | No — no `AfricanVoiceReader`, `ChatVoiceLanguageBar`, `gigaVoice.ts` changes |
| Shared test file | `tests/e2e/verified-release-410.spec.ts` modified in both PRs (test-only overlap) |
| #411 used as #412 pass evidence | No — kept separate |

#### PR #412 release decision

**PASS — PRODUCTION VERIFIED**

Evidence: Convex deployed @ `c52cecc`; MTN acceptance test passed on production API; BOLA passed; no generic retrieval failure.

---

### PR #411 — Mobile voice selector + release-410 verification

> **Separate PR — evidence from #411 only. Not re-tested as part of #412 gate.**

#### Baseline

| Field | Value |
|-------|-------|
| PR | https://github.com/Ayiiga/Giga3-v2/pull/411 |
| Merge commit | `e883226dcc5bb3f8702a48d3a64bd0c4d99a2ac4` |
| Merged at | 2026-09-21T08:09:28Z |
| Convex deploy | Run [35576429969](https://github.com/Ayiiga/Giga3-v2/actions/runs/35576429969) — success @ `e883226` |
| Pages deploy | Run [35576429901](https://github.com/Ayiiga/Giga3-v2/actions/runs/35576429901) — success @ `e883226` |

**Key files:** `web/components/chat/AfricanVoiceReader.tsx`, `ChatShell.tsx`, `ChatVoiceLanguageBar.tsx`, `web/styles/chat-mobile-app.css`, voice/E2E tests.

#### Automated Tests @ `c52cecc` (E2E file shared; results reflect current production)

| Gate | Result | Evidence |
|------|--------|----------|
| Unauthenticated smoke | 5/5 PASS | Chat 200, SW `giga3-v6`, CSS bundle, guest voice hidden |
| Authenticated voice/TTS E2E | 17/17 SKIPPED | `GIGA3_E2E_EMAIL` not set |

#### Production Tests (#411 scope)

| Test | Result | Evidence |
|------|--------|----------|
| Voice bar in production bundle | **PASS** | String `chat-voice-language-bar` found in chunk `1523-47f566e26e344f0b.js` @ `c52cecc` production |
| Chunk `2889-f672a36acfc03a59.js` @ `e883226` | **SUPERSEDED** | No longer referenced on chat page after `c52cecc` Pages redeploy |
| Mobile voice selector visible (authenticated) | **UNVERIFIED** | AUTHENTICATED TEST: BLOCKED — no credentials |
| Read Aloud / TTS cancellation | **UNVERIFIED** | AUTHENTICATED TEST: BLOCKED — no credentials |
| Console / network (voice) | **UNVERIFIED** | No browser session recorded @ `c52cecc` |

#### PR #411 release decision

**PARTIAL — PRODUCTION VERIFICATION INCOMPLETE**

Unauthenticated smoke passes; authenticated voice/TTS workflows not verified in production.

---

## 4. Remaining Risks (evidence-backed only)

| Risk | Severity | Evidence |
|------|----------|----------|
| Playwright authenticated E2E not run in CI/local | Medium | 17/22 tests skipped; `GIGA3_E2E_EMAIL` not set |
| PR #411 voice/TTS not production-verified with auth | Medium | Guest shell hides voice bar by design; auth tests skipped |
| PR #412 explicit "user-provided" disclosure phrasing | Low | Post-deploy reply summarized content but did not use exact `userContextDisclosurePrefix()` wording |
| PR #412 live-web rate-limit non-consumption | Low | UNVERIFIED — inferred from reply latency, not meter inspection |
| Browser console/hydration on chat | Low | UNVERIFIED — no DevTools capture @ `c52cecc` |
| Pages redeploy on #412 merge | Informational | Run `35587481466` triggered by `main` push (workflow has no path filter); no `web/` source changes in #412 |

---

## 5. Final Release Decision @ `c52cecc`

| Scope | Decision |
|-------|----------|
| **PR #412 (user-context routing)** | **PASS — PRODUCTION VERIFIED** |
| **PR #411 (mobile voice)** | **PARTIAL — PRODUCTION VERIFICATION INCOMPLETE** |
| **Overall platform @ `c52cecc`** | **DEPLOYED — PR #412 VERIFIED; PR #411 AUTH VOICE UNVERIFIED** |

---

## 6. Evidence Links

| Artifact | Value |
|----------|-------|
| Release SHA | `c52cecc03e7b6f7072940ed8625ed49806a25877` |
| PR #412 merge | https://github.com/Ayiiga/Giga3-v2/pull/412 |
| PR #411 merge | https://github.com/Ayiiga/Giga3-v2/pull/411 |
| Convex deploy (#412) | https://github.com/Ayiiga/Giga3-v2/actions/runs/35587481367 |
| Pages deploy (#412) | https://github.com/Ayiiga/Giga3-v2/actions/runs/35587481466 |
| CI (#412) | https://github.com/Ayiiga/Giga3-v2/actions/runs/35587481475 |
| Convex deploy (#411) | https://github.com/Ayiiga/Giga3-v2/actions/runs/35576429969 |
| Pages deploy (#411) | https://github.com/Ayiiga/Giga3-v2/actions/runs/35576429901 |
| Production URL | https://www.giga3ai.com |
| Convex URL | https://perfect-lark-521.convex.cloud |
| PWA cache | `giga3-v6` |
| Verified chunks | `2117-7490bc15788ef45c.js`, `fd9d1056-516d0703cfb2a43c.js`, `1523-47f566e26e344f0b.js` |
| Post-deploy JSON | `/opt/cursor/artifacts/pr412-post-deploy-report.json` |
| Unit tests | 1216/1216 PASS @ `c52cecc` (2026-09-21) |
| E2E | 5 PASS / 17 SKIPPED — `verified-release-410.spec.ts` |
