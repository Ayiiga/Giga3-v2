# GigaSocial Direct Messaging Foundation

**Status:** Phase 2C schema/auth + Phase 2E backend hardening + Phase 2D UI chrome (all flag-gated, default OFF).  
**Feature flags (default OFF):**
- Convex / server: `GIGASOCIAL_DM_ENABLED` (authoritative production rollout control; keep `false` until approved)
- Client mirror: `NEXT_PUBLIC_GIGASOCIAL_DM` (default `false`; controls Messages nav/UI only)
- Rollout flag is **not** authentication — every handler still requires `requireSession` + participant checks.
- Details: `docs/GIGASOCIAL_DM_M1_M2_BACKEND.md`, `docs/GIGASOCIAL_DM_PHASE2D.md`, `docs/GIGASOCIAL_DM_PHASE2E.md`

**Date:** 2026-10-15  
**Depends on:** Phase 2A notifications inbox stabilization (separate PR).

## Context

The GigaSocial **Inbox** nav label opens the **notifications** activity panel (`socialNotifications`). Direct messages are a separate **Messages** section. Live stream chat (`socialLiveChat`) and AI chat (`conversations`) stay separate.

## Goals

Additive, privacy-first DMs for creators and fans:

- Conversation list with previews and unread counts
- Message requests for non-mutual / non-fan contacts
- Delivery and read states
- Block / report / rate limits
- en/fr UI strings for critical messaging flows
- Offline queue hooks (extend social outbox later — do not break current outbox actions)

## Non-goals (this foundation)

- No second payment system; tips/gifts stay on existing Paystack paths
- No monetization threshold change
- No merge of DMs into `conversations` (AI chat) or `socialLiveChat`
- No public Convex queries that return private message bodies

## Proposed data model (additive)

```text
socialDmThreads
  participantAId: string   // normalized: lexicographically smaller userId
  participantBId: string
  createdAt, updatedAt
  lastMessageAt, lastMessagePreview (truncated, no secrets)
  requestStatus: "open" | "accepted" | "declined"  // open = message request
  initiatedBy: string
  indexes: by_pair (A,B), by_participantA_updated, by_participantB_updated

socialDmMessages
  threadId: Id<"socialDmThreads">
  senderId: string
  body: string                 // text v1; media later via storage intent
  createdAt
  clientId?: string            // idempotent send / offline dedupe
  deliveryState: "sent" | "delivered"  // server-set
  indexes: by_thread_created, by_sender_created, by_thread_client

socialDmReads
  threadId, userId, lastReadAt
  index: by_thread_user

socialDmBlocks
  blockerId, blockedId, createdAt
  index: by_blocker, by_pair

socialDmReports
  reporterId, threadId?, messageId?, reason, details?, createdAt, status
  index: by_reporter_created, by_status
```

Participant authorization: every query/mutation requires `requireSession`; recipient must be a thread participant. Never return another user’s threads.

## Privacy & security boundaries

| Control | Rule |
|---------|------|
| Auth | Session required; reject missing/invalid tokens |
| Isolation | Index by participant; no public `listAllMessages` |
| Requests | Non-mutual / non-fan → `requestStatus: open` until accept |
| Block | Bidirectional; hides threads and forbids history/send/accept (Phase 2E) |
| Report | Server-side insert only; no public listing of reports |
| Rate limit | Reuse / extend `socialRateLimit.ts` (`dm_send`) |
| Logs | Never log message bodies or storage IDs |
| Media | v1 text-only; later use existing upload-intent pattern (not raw client URLs) |

## Unread & pagination

- Unread (UI): client localStorage last-read until server `socialDmReads` APIs ship
- Thread list: participant indexes + block filter; page size ≤ 40 with bounded scan + opaque cursor
- Message history: newest-first compound cursor `(createdAt, messageId)` within thread, page size ≤ 50
- Badge: separate lightweight query later; never `.collect()` unbounded

## Localization

- UI locale catalogs (`en`, `fr`) for compose, empty, request, block, report, errors (`web/lib/gigasocial/dmLocale.ts`)
- Keep separate from AI response language (`languagePreferences.ts`)
- Payment/security strings for any tip CTAs from DM remain existing Paystack copy paths

## Offline / reconnect

- Online-only sends with clear offline error (Phase 2D)
- Future: extend `socialOutbox` with `dm_send` + `clientId` idempotency
- Do not change existing outbox action union without tests

## Feature flag & rollout

1. Ship schema + APIs + UI behind defaults OFF
2. Enable for staff / internal on **non-production** first
3. Enable message requests + block/report before open DMs for all users
4. Notifications remain the default **Inbox**; **Messages** is a distinct entry

## Migration / deploy implications

- Additive tables only; no changes to `socialNotifications` shape
- Convex deploy required for schema + `gigaSocialDm` module; **leave `GIGASOCIAL_DM_ENABLED` unset/false** until approved
- No data backfill
- Clients without the client flag never show Messages chrome

## Implemented in Phase 2C

1. Schema + indexes in `convex/schema.ts`
2. Policy helpers: `convex/gigaSocialDmPolicy.ts`
3. Handlers: `listMyThreads`, `listThreadMessages`, `sendMessage`, `acceptRequest`, `blockUser`, `reportMessage`, `getDmFoundationStatus`
4. Rate limit action `dm_send` in `socialRateLimit.ts`
5. Focused tests: `tests/gigasocial/gigaSocialDmFoundation.test.ts`

## Implemented in Phase 2E (backend hardening)

1. M1 bidirectional block enforcement on list/history/send/accept
2. M2 index-range pagination (compound cursor in #522 integration)
3. Soft `declineRequest` (no auto-block); reopen-on-send unless blocked
4. Tests: `tests/gigasocial/gigaSocialDmHardening.test.ts`
5. Docs: `docs/GIGASOCIAL_DM_PHASE2E.md`, `docs/GIGASOCIAL_DM_M1_M2_BACKEND.md`

### M1 block access matrix (server-enforced)

| Operation | Blocker | Blocked peer | Notes |
|-----------|---------|--------------|-------|
| `listMyThreads` | Hidden | Hidden | Thread row retained; not returned |
| `listThreadMessages` | Forbidden | Forbidden | No bodies; history not deleted |
| `sendMessage` | Forbidden | Forbidden | Either direction |
| `acceptRequest` | Forbidden | Forbidden | While block exists |
| `declineRequest` | Allowed if participant | Allowed if participant | Soft close; does not create a block |
| `blockUser` | Idempotent | N/A | Declines open request as side effect |
| `reportMessage` | Allowed | Allowed | Abuse path; response has no peer bodies |

### Soft decline (`declineRequest`)

- Recipient only; not the initiator
- `open` → `declined` (idempotent if already declined)
- `accepted` → Forbidden (use block)
- Declined cannot be `acceptRequest`ed
- Later `sendMessage` (if not blocked) re-opens as `open` with `initiatedBy` = sender
- Concurrent accept/decline: Convex OCC; winner sticks, loser retries into Forbidden/idempotent paths

## Implemented in Phase 2D (UI)

1. Distinct **Messages** section (does not replace Inbox / notifications)
2. Mobile-first thread list + conversation + composer (`web/components/gigasocial/dm/`)
3. Accept via `acceptRequest`; Decline & block → `blockUser` (soft `declineRequest` not wired in UI yet)
4. Block / report menus using existing mutations
5. en/fr UI catalog (`web/lib/gigasocial/dmLocale.ts`)
6. Client-only unread via localStorage
7. Feature-disabled / server-disabled empty states

## Release gate

- Keep both flags off until non-prod QA with `GIGASOCIAL_DM_ENABLED=true`
- Compound cursor + thread-list fill fixes required before high-volume messaging
- Optional: wire UI soft decline to `declineRequest`; server unread APIs
