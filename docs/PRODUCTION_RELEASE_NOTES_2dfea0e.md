# Giga3 AI — Full Release Train Audit (PR #410–#414)

**Release SHA (main tip):** `2dfea0e5b56f2d17c690fd53466f1fd1d5c10e3f`  
**Generated:** 2026-09-21T11:15Z (UTC)  
**Production URL:** https://www.giga3ai.com  
**Repository:** https://github.com/Ayiiga/Giga3-v2  
**Evidence policy:** Claims cite git, GitHub Actions, curl, Playwright, or live Convex API only. SKIPPED ≠ PASS.

---

## 1. Executive Summary

| PR | Title | Merge commit | Merged | Deployed | Verification |
|----|-------|--------------|--------|----------|--------------|
| **#410** | feat(chat): fresh chat surface, premium answer blocks, unified voice layer | `4afff6c` | Yes — 2026-09-21T02:29:05Z | Pages [35554325683](https://github.com/Ayiiga/Giga3-v2/actions/runs/35554325683) @ `4afff6c` | **DEPLOYED BUT NOT FULLY VERIFIED** — no auth E2E this audit |
| **#411** | fix(chat): mobile voice selector + release-410 runtime/E2E verification | `e883226` | Yes — 2026-09-21T08:09:28Z | Pages [35576429901](https://github.com/Ayiiga/Giga3-v2/actions/runs/35576429901) @ `e883226`; Convex [35576429969](https://github.com/Ayiiga/Giga3-v2/actions/runs/35576429969) @ `e883226` | **PARTIAL** — unauthenticated smoke PASS; auth voice/TTS **BLOCKED** |
| **#412** | Fix chat user-context preservation when news retrieval fails | `c52cecc` | Yes — 2026-09-21T10:12:14Z | Convex [35587481367](https://github.com/Ayiiga/Giga3-v2/actions/runs/35587481367) @ `c52cecc`; Pages [35587481466](https://github.com/Ayiiga/Giga3-v2/actions/runs/35587481466) @ `c52cecc` | **PASS — PRODUCTION VERIFIED** (MTN + BOLA via live Convex API) |
| **#413** | docs: production release notes for c52cecc | `f9b0796` | Yes — 2026-09-21T10:58:44Z | Pages [35591584999](https://github.com/Ayiiga/Giga3-v2/actions/runs/35591584999) @ `f9b0796` | **N/A** — documentation only |
| **#414** | feat(chat): English (British) as primary voice language | `2dfea0e` | Yes — 2026-09-21T11:02:52Z | Pages [35591956396](https://github.com/Ayiiga/Giga3-v2/actions/runs/35591956396) @ `2dfea0e` | **PARTIAL** — bundle/hash verified; auth voice picker **BLOCKED** |

**Commit chain on `main` (newest first):**

```
2dfea0e feat(chat): English (British) as primary voice language (#414)
f9b0796 docs: production release notes for c52cecc (PR #412 verified, PR #411 partial) (#413)
c52cecc Fix chat user-context preservation when news retrieval fails (#412)
e883226 fix(chat): mobile voice selector + release-410 runtime/E2E verification (#411)
4afff6c feat(chat): fresh chat surface, premium answer blocks, unified voice layer (#410)
```

---

## 2. Release Integrity

### Baseline markers on `main` @ `2dfea0e`

| Marker | Present |
|--------|---------|
| `convex/newsEvidence/userContextRouting.ts` | **Yes** |
| `english-british` in `web/lib/chat/gigaVoice.ts` | **Yes** (lines 20, 36) |
| `chat-voice-language-bar--mobile` in `ChatShell.tsx` | **Yes** (line 678) |
| Working tree | Clean for release code; local sitemap/splash PNG diffs from build tooling (not committed) |

### Production identity

| Check | Result | Evidence |
|-------|--------|----------|
| PWA cache | `giga3-v6` | `curl -s https://www.giga3ai.com/sw.js \| grep CACHE_VERSION` |
| Convex URL | `https://perfect-lark-521.convex.cloud` | Chat page HTML bootstrap |
| Frontend deploy SHA (Pages) | `2dfea0e` | Run [35591956396](https://github.com/Ayiiga/Giga3-v2/actions/runs/35591956396) headSha |
| Convex deploy SHA (backend) | `c52cecc` | Run [35587481367](https://github.com/Ayiiga/Giga3-v2/actions/runs/35587481367) headSha (#414 did not change Convex) |
| `english-british` in live JS | **Yes** | Chunk `4399-4d5da4361bbeab16.js` |
| `chat-voice-language-bar--mobile` in live JS | **Yes** | Chunk `1523-47f566e26e344f0b.js` |
| Default voice id in bundle | `english-british` | Same chunk (`giga3_voice_language_id` default) |
| Chunk `2889-f672a36acfc03a59.js` (@ #411 `e883226`) | **Superseded** | Not referenced on chat page after `2dfea0e` Pages redeploy |
| `userContextRouting` in frontend bundle | **Not expected** | Convex-only (#412) |

### SHA256 — local build @ `2dfea0e` vs production

| Chunk | SHA256 (prod = local) | Match |
|-------|------------------------|-------|
| `4399-4d5da4361bbeab16.js` (#414 voice layer) | `1ea1c636475b0545e2855e4677dd71a1cbb7acf264d62a174449259255cde800` | **YES** |
| `1523-47f566e26e344f0b.js` (#411 voice bar) | `f0d0f7c9c53d8152b8fbc736fdf01dd891c07babd965e589a1076f0fc62b41e6` | **YES** |
| `2117-7490bc15788ef45c.js` (shared) | `913553b783973b7515f25100fc4de31b9c46245ca70dc191cb26742468ca3def` | **YES** |

**Production identity confidence:** **High** (hash-verified frontend @ `2dfea0e`; Convex backend @ `c52cecc` from Actions headSha)

### Automated gates @ `2dfea0e` (2026-09-21)

| Gate | Result |
|------|--------|
| Unit tests | **1217/1217 PASS** (233 files) |
| Build | **PASS** |
| Lint | **PASS** (5 pre-existing warnings) |
| SEO audit | **PASS** — 0 errors, 2 warnings |
| Playwright unauthenticated | **5 PASS / 1 SKIPPED / 16 SKIPPED** (auth tests skipped — no `GIGA3_E2E_EMAIL`) |

---

## 3. Per-PR Sections

### PR #410 — Fresh chat surface, premium answer blocks, unified voice layer

**Merge:** `4afff6ce0366a1b11f9c0aa604de950cbdb5eb0e` — MERGED 2026-09-21T02:29:05Z  
**Deploy:** Pages [35554325683](https://github.com/Ayiiga/Giga3-v2/actions/runs/35554325683) @ `4afff6c`  
**Files changed:** 16 (chat UI, `gigaVoice.ts`, answer blocks, tests)

#### Architecture (TTS ownership)
- Introduced unified `web/lib/chat/gigaVoice.ts` — single chat TTS runtime.
- Call sites: `AnswerBlockActions`, `AfricanVoiceReader`, `readAloud.ts`, `useChatPlatform` / `useSupabaseChatPlatform` (`stopGigaVoice` on navigation).
- Separate TTS stacks remain in GigaLearn, GigaEdit, Media (not modified by #410).

#### Production tests
| Test | Result | Evidence |
|------|--------|----------|
| Answer blocks in bundle | **INFERRED PASS** | CSS bundle E2E smoke passes on production |
| Fresh chat / New Chat | **UNVERIFIED** | Auth E2E skipped |
| Unified voice cancel | **UNVERIFIED** | Auth E2E skipped |

**Decision:** **DEPLOYED BUT NOT FULLY VERIFIED**

---

### PR #411 — Mobile voice selector + release-410 verification

**Merge:** `e883226dcc5bb3f8702a48d3a64bd0c4d99a2ac4` — MERGED 2026-09-21T08:09:28Z  
**Deploy:** Pages [35576429901](https://github.com/Ayiiga/Giga3-v2/actions/runs/35576429901); Convex [35576429969](https://github.com/Ayiiga/Giga3-v2/actions/runs/35576429969)  
**Files changed:** 14 — `ChatVoiceLanguageBar.tsx`, `ChatShell.tsx`, `AfricanVoiceReader.tsx`, `chat-mobile-app.css`, E2E tests

#### TTS ownership audit
| Owner | Role |
|-------|------|
| `gigaVoice.ts` | Authoritative chat TTS (speak/stop/toggle) |
| `ChatVoiceLanguageBar` | Mobile pill selector; reads/writes `giga3_voice_language_id` |
| `AfricanVoiceReader` | Desktop voice chips + play; `selectorOnly` mode for answer blocks |
| `ChatShell` | Renders mobile bar: `chat-voice-language-bar--mobile lg:hidden` |
| Lifecycle | `stopGigaVoice()` on New Chat / platform hooks; unmount cleanup in `AfricanVoiceReader` |

**Duplicate risk:** Low — chat paths delegate to `gigaVoice.ts`; GigaLearn/Media use separate modules.

#### Production tests
| Test | Result | Evidence |
|------|--------|----------|
| Unauthenticated chat 200 | **PASS** | Playwright |
| SW `giga3-v6` | **PASS** | Playwright |
| CSS bundle loads | **PASS** | Playwright (existence check, not stale hash) |
| Guest voice hidden | **PASS** | Playwright mobile — auth-gated by design |
| Mobile voice bar visible (auth) | **BLOCKED** | `GIGA3_E2E_EMAIL` not set |
| Read Aloud / stop / overlap | **BLOCKED** | Auth + browser TTS not exercised |
| `chat-voice-language-bar--mobile` in prod | **PASS** | Chunk `1523-47f566e26e344f0b.js` |

**Decision:** **PARTIAL — PRODUCTION VERIFICATION INCOMPLETE**

---

### PR #412 — User-context preservation when news retrieval fails

**Merge:** `c52cecc03e7b6f7072940ed8625ed49806a25877` — MERGED 2026-09-21T10:12:14Z  
**Deploy:** Convex [35587481367](https://github.com/Ayiiga/Giga3-v2/actions/runs/35587481367) @ `c52cecc`  
**Files changed:** 16 — `userContextRouting.ts` (new), `researchCapabilities.ts`, `chatReplyWorker.ts`, `postValidation.ts`, tests

#### Routing ownership audit
| Component | Role |
|-----------|------|
| `classifyInformationRequest()` | Authoritative mode classifier |
| `queryNeedsLiveWeb()` | Returns `false` for `answer_from_user_context` |
| `resolveResearchCapability()` | `general` for user-context pastes |
| `shouldEnableWebSearch()` | Skips user-context pastes |
| `chatReplyWorker.ts` | Injects guidance; skips empty news evidence on user-context |
| `postValidation.ts` | Recovery answer when generic retrieval failure detected |

**Auth / BOLA:** No new cross-user queries. Session-scoped conversation access enforced in `messages:listByConversation`.

**Credit impact:** User-context mode reduces live-web invocations (not meter-verified this audit).

#### Production tests (live Convex API, ephemeral accounts — 2026-09-21T11:16Z)
| Test | Result | Evidence |
|------|--------|----------|
| MTN paste — no generic failure | **PASS** | `genericFailure: false` |
| MTN — GHS amounts present | **PASS** | `hasGHS: true` |
| MTN — deadline present | **PASS** | Reply: "October 19, 2026" |
| Reply latency | **PASS** | ~3205 ms (consistent with no live-web research) |
| BOLA — User B → User A conversation | **PASS** | `userBCount: 0` |

**Decision:** **PASS — PRODUCTION VERIFIED**

---

### PR #413 — Release notes documentation

**Merge:** `f9b0796b2994cdfd8c7ebd7fde9e90398dd43fe1` — MERGED 2026-09-21T10:58:44Z  
**Contains:** `docs/PRODUCTION_RELEASE_NOTES_c52cecc.md` only  
**Deploy:** Pages rebuild [35591584999](https://github.com/Ayiiga/Giga3-v2/actions/runs/35591584999) — no runtime change

**Decision:** **N/A — documentation**

---

### PR #414 — English (British) as primary voice language

**Merge:** `2dfea0e5b56f2d17c690fd53466f1fd1d5c10e3f` — MERGED 2026-09-21T11:02:52Z  
**Deploy:** Pages [35591956396](https://github.com/Ayiiga/Giga3-v2/actions/runs/35591956396) @ `2dfea0e`  
**Files changed:** 5 — `gigaVoice.ts`, `voiceLanguagePreference.ts`, `AfricanVoiceReader.tsx`, tests

#### Changes
- `english-british` (`en-GB`, 🇬🇧) first in `GIGA_CHAT_VOICES`
- Default `giga3_voice_language_id` → `english-british` for new users
- African voices unchanged as secondary options

#### Production tests
| Test | Result | Evidence |
|------|--------|----------|
| `english-british` in live bundle | **PASS** | Chunk `4399-4d5da4361bbeab16.js` |
| Default id in bundle | **PASS** | `english-british` default in minified preference module |
| SHA256 match local vs prod | **PASS** | See §2 |
| New incognito default (UI) | **BLOCKED** | No browser session / auth |
| Existing localStorage preserved | **UNVERIFIED** | Requires manual browser test |

**Decision:** **PARTIAL** — bundle verified; authenticated picker behavior **BLOCKED**

---

## 4. Console / Network Findings

| Finding | Classification |
|---------|----------------|
| Playwright unauthenticated smoke — no failures | **Non-defect** |
| Production Convex API — signup, acceptMessage, listByConversation succeed | **#412 verified** |
| No `/news*` frontend routes (404) | **Expected** — routing is Convex-only |
| Cloudflare challenge script in HTML | **Pre-existing / unrelated** |
| Browser console hydration/fatal errors | **UNVERIFIED** — no DevTools capture this audit |
| Auth voice/TTS network | **UNVERIFIED** — auth blocked |

---

## 5. Remaining Risks

| Risk | Severity | Evidence |
|------|----------|----------|
| PR #411 authenticated voice/TTS not production-verified | **High** | 17/22 Playwright tests skipped; `GIGA3_E2E_EMAIL` not set |
| PR #410 fresh chat / answer-block auth flows | **Medium** | Auth E2E skipped |
| PR #414 incognito default voice UI | **Low** | Bundle default verified; UI not browser-tested |
| Convex backend SHA (`c52cecc`) behind frontend SHA (`2dfea0e`) | **Informational** | Expected — #414 is frontend-only; no backend drift |
| Chunk hash rotation on each Pages deploy | **Informational** | `2889-*` superseded; use marker strings + SHA256 |

---

## 6. Release Decision

### Overall @ `2dfea0e`: **PARTIAL — PRODUCTION VERIFICATION INCOMPLETE**

**Rationale (per gate rules):**
- **PASS criteria not met:** Authenticated #411 voice audio smoke was **not** exercised (BLOCKED).
- **#412 PASS:** MTN user-context + BOLA verified on production Convex with ephemeral authenticated accounts (~3.2s reply, no generic failure).
- **#414 PARTIAL:** Bundle/hash/default-id verified on production; auth UI not browser-tested.
- **All five PRs merged and deployed** — no merge/deploy action required this audit.

| PR | Individual decision |
|----|---------------------|
| #410 | DEPLOYED BUT NOT FULLY VERIFIED |
| #411 | PARTIAL |
| #412 | **PASS — PRODUCTION VERIFIED** |
| #413 | N/A (docs) |
| #414 | PARTIAL |

---

## 7. Evidence Links

| Artifact | Value |
|----------|-------|
| Main SHA | `2dfea0e5b56f2d17c690fd53466f1fd1d5c10e3f` |
| PR #410 | https://github.com/Ayiiga/Giga3-v2/pull/410 — merge `4afff6c` |
| PR #411 | https://github.com/Ayiiga/Giga3-v2/pull/411 — merge `e883226` |
| PR #412 | https://github.com/Ayiiga/Giga3-v2/pull/412 — merge `c52cecc` |
| PR #413 | https://github.com/Ayiiga/Giga3-v2/pull/413 — merge `f9b0796` |
| PR #414 | https://github.com/Ayiiga/Giga3-v2/pull/414 — merge `2dfea0e` |
| Convex deploy (#412) | https://github.com/Ayiiga/Giga3-v2/actions/runs/35587481367 |
| Pages deploy (#414) | https://github.com/Ayiiga/Giga3-v2/actions/runs/35591956396 |
| Unit tests | 1217/1217 PASS @ `2dfea0e` |
| Playwright smoke | 5 PASS / 17 SKIPPED |
| Verified chunks | `4399-4d5da4361bbeab16.js`, `1523-47f566e26e344f0b.js`, `2117-7490bc15788ef45c.js` |
| Production URL | https://www.giga3ai.com |
| Convex URL | https://perfect-lark-521.convex.cloud |
