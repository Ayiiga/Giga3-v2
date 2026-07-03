# Giga3 Chat System — Root Cause Analysis & Hardening Report

**Date:** 2026-07-03  
**Scope:** Send button → rendered AI response (Convex primary path)  
**Architecture:** Preserved — async job queue + HTTP polling (no SSE rewrite)

---

## Executive summary

The chat system uses **fast-ack async jobs**, not token streaming. The primary production failure mode on mobile (especially 3G in Africa) was **stale PWA JavaScript** pointing at a **deleted Convex deployment** (`happy-otter-123.convex.cloud`), combined with **cache-first service worker** serving old `/_next/` bundles. Secondary gaps included websocket mutations for edit/regenerate/cancel, recovery timing races, and silent error swallowing in HTTP polling.

**PR #101 (merged)** fixed the stale Convex URL and SW cache strategy. **This hardening pass** closes remaining hang/silent-failure gaps without architectural changes.

---

## Request lifecycle

```
User taps Send
  → ChatInput.submit()
  → ChatShell.handleSend()
  → useChatPlatform.sendMessage()
      ├─ offline → IndexedDB outbox (+ visible error)
      └─ online  → convexHttpCall POST chatMessaging:acceptMessage (HTTP, not WS)
            → acceptMessage mutation: insert user msg + chatReplyJobs row
            → scheduler → chatReplyWorker.processJob
            → chatEngine.completeChatWithFailover (provider chain, 100s budget)
            → appendMessage (assistant)
  → Client detects reply via:
      1. Convex live query (websocket) — messages.listByConversation
      2. HTTP polling fallback — useChatReplyPolling (burst on 3G)
      3. getReplyStatus query
      4. Fixed replyDeadlineRef failsafe (150–180s)
  → MessageList renders bubble; useStreamingReveal animates text cosmetically
```

**Not used:** SSE, EventSource, or server-side token streaming.

---

## Root causes (ranked)

### RC-1 — Stale Convex URL in cached PWA bundles (CRITICAL) ✅ Fixed in PR #101

| Item | Detail |
|------|--------|
| **Symptom** | "Generating response…" forever on 3G; marketplace/chat "Could not reach server" |
| **Cause** | `NEXT_PUBLIC_CONVEX_URL` secret pointed at deleted `happy-otter-123.convex.cloud`. SW cache-first served old `/_next/` chunks embedding that URL. |
| **Evidence** | Live chunk `2501-*.js` contained `happy-otter-123`; `curl` returns 404 for that host. |
| **Fix** | `ConvexRuntimeBootstrap` injects URL via fresh HTML; `normalizeConvexUrl()` remaps retired hosts; SW network-first for `/_next/`; CI health-check + denylist verifier. |

### RC-2 — Websocket mutations hang on 2G/3G (HIGH) ✅ Fixed this pass

| Item | Detail |
|------|--------|
| **Symptom** | Regenerate / edit / stop silently do nothing on slow networks |
| **Cause** | `regenerateMessage`, `editAndResend`, `cancelReply` used `useMutation` (websocket) while send already used HTTP. |
| **Fix** | All chat mutations routed through `convexMutationWithTimeout` (HTTP POST + client timeout). UI sets `awaitingReply` **before** mutation ack. |

### RC-3 — Recovery cron vs worker timing race (HIGH) ✅ Fixed this pass

| Item | Detail |
|------|--------|
| **Symptom** | Duplicate assistant messages (fallback + real reply) |
| **Cause** | Recovery `giveUpAfterMs` was 90s; worker timeout 120s. Recovery wrote fallback while worker still running. |
| **Fix** | `giveUpAfterMs` default raised to 125s; worker checks `hasAssistantReplySince` before append. |

### RC-4 — Infinite spinner edge cases (MEDIUM) ✅ Mostly fixed earlier; gaps closed now

| Item | Detail |
|------|--------|
| **Offline send** | `isSending` stayed true until 150s failsafe → now cleared immediately. |
| **Poll errors** | Swallowed silently → now logged + user hint after 4 consecutive failures. |
| **Session bootstrap** | `createUser` failure silent → now surfaces error. |
| **Duplicate sends** | ChatInput enabled during send → now disabled while sending/awaiting. |

### RC-5 — CSP blocked Convex WebSockets (MEDIUM) ✅ Fixed in PR #101

`wss://*.convex.cloud` added to `connect-src` in `_headers`.

---

## Hang / failure inventory (post-fix status)

| ID | Location | Issue | Status |
|----|----------|-------|--------|
| F1 | `useChatPlatform` offline send | `isSending` not cleared | ✅ Fixed |
| F7–F9 | regenerate / edit / cancel | WS mutations, no timeout | ✅ Fixed (HTTP) |
| F10 | `createUser` | Silent bootstrap failure | ✅ Fixed |
| F12 | `useChatReplyPolling` | Poll errors swallowed | ✅ Fixed (log + hint) |
| F15 | `ChatConversationPane` | Duplicate sends allowed | ✅ Fixed |
| B9 | Recovery vs worker 90s/120s | Duplicate replies | ✅ Fixed |
| N1 | `convexCall` | Non-JSON 502 opaque errors | ✅ Improved message |
| RC-1 | SW + stale URL | Dead backend | ✅ Fixed PR #101 |

**Remaining by design (low risk):**
- Live queries may lag on 3G — mitigated by HTTP polling burst.
- SW auto-reload on update may interrupt active chat — acceptable for cache freshness.
- Supabase hybrid mode: limited stop/edit support (secondary path).

---

## Timeouts & failsafes (current)

| Layer | Timeout | On expiry |
|-------|---------|-----------|
| HTTP send (normal) | 45s × 3 retries | Error + outbox queue |
| HTTP send (3G) | 90s × 4 retries | Error + outbox queue |
| Reply wait (normal) | 150s | Visible error |
| Reply wait (3G) | 180s | Visible error |
| Worker text | 120s | Fallback assistant message |
| Worker image | 150s | Fallback assistant message |
| Recovery give-up | 125s | Fallback if no reply exists |
| Engine failover budget | 100s | `local_fallback` message |

---

## Logging

### Server (`convex/chatReplyLog.ts`)
Structured JSON: `worker_start`, `worker_done`, `worker_failed`, `job_recovered`, `recovery_sweep`.

### Client (`web/lib/chat/chatLog.ts`)
Enable: `?chatLog=1` or `localStorage.giga3_chat_log = "1"`.

Events: `send_start`, `send_ack`, `send_fail`, `reply_detected`, `reply_timeout`, `poll_ok`, `poll_fail`, `regenerate_start`, `edit_start`, `cancel_start`.

Never logs message content.

---

## Service worker & PWA cache

| Rule | Implementation |
|------|----------------|
| Chat HTML | Never cached (`isSensitiveDocumentPath`) |
| `/_next/` chunks | **Network-first** (cache only offline fallback) |
| On SW activate | Purge all cached `/_next/` entries |
| Convex URL | Bootstrap script in HTML before app JS |
| Cache version | `giga3-shell-v41-chat-hardening` |

---

## Files changed (hardening pass)

- `web/hooks/useChatPlatform.ts` — HTTP mutations, logging, offline/poll fixes
- `web/hooks/useChatReplyPolling.ts` — failure tracking, burst polling
- `web/lib/chat/convexMutation.ts` — shared HTTP mutation + timeout
- `web/lib/chat/chatLog.ts` — client structured logging
- `web/lib/network/convexCall.ts` — non-JSON error message
- `web/components/chat/ChatConversationPane.tsx` — disable input while busy
- `convex/chatReplyRecoveryPolicy.ts` — giveUp 125s
- `convex/chatReplyJobs.ts` — `hasAssistantReplySince` query
- `convex/chatReplyWorker.ts` — skip duplicate append
- `web/public/sw.js` — cache bump

---

## Verification checklist

- [ ] Merge hardening PR and deploy frontend + Convex backend
- [ ] On phone: hard-refresh PWA once after deploy
- [ ] Send message on 3G — should show progressive labels, receive reply within ~2 min
- [ ] Enable `?chatLog=1` — confirm `send_ack` → `poll_ok` → `reply_detected`
- [ ] Regenerate / Stop on 3G — spinner appears, completes or shows error (no silent hang)
- [ ] Confirm live bundle has no `happy-otter-123` (`verify-convex-in-build.mjs` in CI)
