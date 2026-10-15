# GigaSocial Direct Messaging Foundation (Phase 2B design / Phase 2C stubs)

**Status:** Phase 2C stubs + Phase 2D UI chrome (flag-gated, default OFF).  
**Feature flags (default OFF):**
- Convex / server: `GIGASOCIAL_DM_ENABLED` (preferred for production; keep `false` until rollout)
- Client mirror: `NEXT_PUBLIC_GIGASOCIAL_DM` (default `false`; controls Messages nav/UI only)
- Rollout flag is **not** authentication — every handler still requires `requireSession` + participant checks.
- See `docs/GIGASOCIAL_DM_M1_M2_BACKEND.md` for block/pagination server follow-ups before public enablement.

**Date:** 2026-10-15  
**Depends on:** Phase 2A notifications inbox stabilization (separate PR).

## Context

The current GigaSocial “Inbox” nav label opens the **notifications** activity panel (`socialNotifications`). There is no 1:1 DM subsystem. Live stream chat (`socialLiveChat`) and AI chat (`conversations`) must stay separate.

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
  indexes: by_thread_created, by_sender_created

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
| Block | Blocks both directions of new messages; hide threads |
| Report | Server-side insert only; no public listing of reports |
| Rate limit | Reuse / extend `socialRateLimit.ts` patterns |
| Logs | Never log message bodies or storage IDs |
| Media | v1 text-only; later use existing upload-intent pattern (not raw client URLs) |

## Unread & pagination

- Unread = messages with `createdAt > socialDmReads.lastReadAt` for that user (exclude own sends)
- Thread list: paginate by `lastMessageAt` desc, page size ≤ 40
- Message history: paginate by `createdAt` desc within thread, page size ≤ 50
- Badge: separate lightweight query (count threads with unread > 0), never `.collect()` unbounded

## Localization

- UI locale catalogs (`en`, `fr`) for compose, empty, request, block, report, errors
- Keep separate from AI response language (`languagePreferences.ts`)
- Payment/security strings for any tip CTAs from DM remain existing Paystack copy paths

## Offline / reconnect

- Phase 2C+: extend `socialOutbox` with `dm_send` action + `clientId` idempotency
- Until then, online-only sends with clear offline error
- Do not change existing outbox action union without tests

## Feature flag & rollout

1. Ship schema + internal APIs behind `NEXT_PUBLIC_GIGASOCIAL_DM=false`
2. Enable for staff / internal accounts
3. Enable message requests + block/report before open DMs for all users
4. Notifications stay the default “Inbox” until DM UI is ready; then Inbox can tab Activity | Messages

## Migration safety

- Additive tables only; no changes to `socialNotifications` shape
- Existing notification APIs remain source of truth for activity
- Backward compatible: clients without the flag never call DM endpoints

## Migration / deploy implications (Phase 2C)

- Additive tables only (`socialDmThreads`, `socialDmMessages`, `socialDmReads`, `socialDmBlocks`, `socialDmReports`).
- Convex deploy required for schema + new module; **leave `GIGASOCIAL_DM_ENABLED` unset/false**.
- No data backfill. Empty tables until flag enabled and clients call APIs.
- `socialNotifications` unchanged.

## Implemented in Phase 2C

1. Schema + indexes in `convex/schema.ts`
2. Policy helpers: `convex/gigaSocialDmPolicy.ts`
3. Handlers: `listMyThreads`, `listThreadMessages`, `sendMessage`, `acceptRequest`, `blockUser`, `reportMessage`, `getDmFoundationStatus`
4. Rate limit action `dm_send` in `socialRateLimit.ts`
5. Focused tests: `tests/gigasocial/gigaSocialDmFoundation.test.ts`

<<<<<<< HEAD
## Phase 2E — backend hardening (M1 / M2 / soft decline)

See `docs/GIGASOCIAL_DM_PHASE2E.md` and `docs/GIGASOCIAL_DM_M1_M2_BACKEND.md`.

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

- Recipient only; not the initiator.
- `open` → `declined` (idempotent if already declined).
- `accepted` → Forbidden (cannot soft-decline an accepted chat; use block).
- Declined cannot be `acceptRequest`ed.
- Later `sendMessage` (if not blocked) re-opens as `open` with `initiatedBy` = sender (new request).
- Blocking remains a separate action and still hides history (M1).

### M2 pagination

`listThreadMessages` uses `by_thread_created` with optional `.lt("createdAt", cursor)`, `order("desc")`, `take(limit)`. Empty deep pages are real empties, not false EOF from a newest-only window.

### UI contract note (Phase 2D)

Phase 2D UI still maps “Decline & block” → `blockUser` only. Wire `declineRequest` in a **separate UI PR** (do not mix into this backend PR).
=======
## Implemented in Phase 2D

1. Distinct **Messages** section (does not replace Inbox / notifications)
2. Mobile-first thread list + conversation + composer (`web/components/gigasocial/dm/`)
3. Accept via `acceptRequest`; decline via **Decline & block** → `blockUser` (no soft-decline API)
4. Block / report menus using existing mutations
5. en/fr UI catalog (`web/lib/gigasocial/dmLocale.ts`)
6. Client-only unread via localStorage (no server unread API yet)
7. M1/M2 safe UI alternatives documented in `docs/GIGASOCIAL_DM_M1_M2_BACKEND.md`

## Next release gate

- Land M1/M2 backend PR
- Keep flags off until QA on non-prod with `GIGASOCIAL_DM_ENABLED=true`
- Soft decline + server unread optional follow-ups
>>>>>>> 8a31865 (feat(gigasocial): Phase 2D direct messaging UI behind default-off flags)
