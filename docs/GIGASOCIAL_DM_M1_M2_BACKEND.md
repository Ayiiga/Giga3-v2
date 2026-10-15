# GigaSocial DM — M1 / M2 backend hardening

**Status:** Phase 2E implemented (merged via #523 onto the 2C line; integrate to `main` with Phase 2D).  
**Related:** `docs/GIGASOCIAL_DM_FOUNDATION.md`, `docs/GIGASOCIAL_DM_PHASE2E.md`, `docs/GIGASOCIAL_DM_PHASE2D.md`

## M1 — Blocking and historical access

**Policy:** Bidirectional block check via `socialDmBlocks.by_pair`. History rows are retained; handlers hide or forbid access.

| Handler | Behavior when blocked either way |
|---------|-----------------------------------|
| `listMyThreads` | Thread omitted from results |
| `listThreadMessages` | `ForbiddenError` — no message bodies |
| `sendMessage` | `ForbiddenError` |
| `acceptRequest` | `ForbiddenError` |
| `declineRequest` | Still allowed (soft close) |
| `reportMessage` | Still allowed (abuse reporting; no bodies in response) |
| `blockUser` | Inserts block; declines open request; does not delete messages |

**Phase 2D UI:** After block, client also locally hides the thread. Server enforcement is authoritative.

## M2 — Message pagination

### Current contract (post-integration)

`listThreadMessages` paginates newest-first with a **compound cursor** `(createdAt, messageId)` so messages that share `createdAt` are not skipped.

Ordering (desc): higher `createdAt` first; for equal `createdAt`, lexicographically greater `messageId` first.

`nextCursor` is an opaque string encoding `{ createdAt, messageId }` of the oldest item on the page when hasMore; otherwise `null`.

Handlers read a bounded scan window (`lte(createdAt)` + sort/filter by compound order). `hasMore` is true when more filtered rows remain in-window or the scan window was full.

Legacy numeric `cursor` (createdAt-only) is still accepted as a `createdAt` exclusive upper bound with empty `messageId` tie-break (compat); new clients should send the compound string.

### Pre-compound note (Phase 2E initial)

Phase 2E first landed exclusive `.lt("createdAt", cursor)` + `take(cap+1)`. That fixed false EOF from newest-only post-filters but could skip peers with the same timestamp. The compound cursor closes that gap.

## Thread list pagination contract

`listMyThreads`:

- Loads from `by_participantA_updated` / `by_participantB_updated`
- Filters bidirectional blocks
- Uses a bounded scan window with continuation via optional `updatedAt`/`threadId` cursor so blocked rows do not permanently consume the page budget
- Max page size 40 (`SOCIAL_DM_THREAD_PAGE_MAX`)
- Does not expose blocked conversations
- Does not unbounded `.collect()`

## Soft decline

`declineRequest` mutation — recipient only; no auto-block; idempotent when already declined; cannot decline an accepted chat; send may reopen unless blocked. See foundation doc.

## Phase 2D UI gaps (not blockers for flag-off deploy)

| Gap | Notes |
|-----|--------|
| Soft `declineRequest` in UI | 2D still uses Decline & block → `blockUser` |
| Server unread / mark-read | 2D uses localStorage last-read only |
| `getDmFoundationStatus.uiAvailable` | Still `false`; UI chrome gated by `NEXT_PUBLIC_GIGASOCIAL_DM` |

## Rollout gate

Do not set `GIGASOCIAL_DM_ENABLED=true` in production until non-prod E2E passes (including compound-cursor and thread-list fill cases).
