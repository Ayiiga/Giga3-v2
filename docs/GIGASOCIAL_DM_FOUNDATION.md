# GigaSocial Direct Messaging Foundation (Phase 2B design)

**Status:** Design only — not implemented. Feature flag reserved: `NEXT_PUBLIC_GIGASOCIAL_DM` (default **off**).  
**Date:** 2026-10-15  
**Depends on:** Phase 2A notifications inbox stabilization.

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

## Next small PR (proposed)

**Phase 2C — DM schema + server stubs (flagged off):**

1. Add tables + validators in `convex/schema.ts`
2. `convex/gigaSocialDm.ts`: `listMyThreads`, `listThreadMessages`, `sendMessage`, `acceptRequest`, `blockUser`, `reportMessage` (session-auth, rate-limited)
3. Unit tests for authz, request gating, block short-circuit
4. No public UI yet

Then **Phase 2D — DM UI** behind the same flag.
