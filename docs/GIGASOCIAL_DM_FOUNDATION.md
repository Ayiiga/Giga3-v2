# GigaSocial Direct Messaging Foundation (Phase 2B design / Phase 2C stubs)

**Status:** Phase 2C implements additive schema + session-auth server stubs in `convex/gigaSocialDm.ts` (no UI).  
**Feature flags (default OFF):**
- Convex / server: `GIGASOCIAL_DM_ENABLED` (preferred for production)
- Client mirror: `NEXT_PUBLIC_GIGASOCIAL_DM` (must stay `false` until UI phase)
- Rollout flag is **not** authentication — every handler still requires `requireSession` + participant checks.

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

## Next small PR

**Phase 2D — DM UI** behind the same flags (Activity | Messages tabs), still no public rollout until QA.
