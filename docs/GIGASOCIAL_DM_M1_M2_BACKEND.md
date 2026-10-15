# GigaSocial DM — M1 / M2 backend (Phase 2E)

**Status:** Implemented on Phase 2E backend hardening branch (stacked on Phase 2C).  
**Depends on:** PR #521 foundation (not merged to `main` as of Phase 2E start).

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

## M2 — Message pagination

`listThreadMessages` uses index range:

```ts
.withIndex("by_thread_created", (q) =>
  cursor === undefined
    ? q.eq("threadId", threadId)
    : q.eq("threadId", threadId).lt("createdAt", cursor)
)
.order("desc")
.take(cap + 1)
```

`nextCursor` is set only when a `(cap + 1)`th row exists (hasMore); otherwise `null`. This avoids a false empty trailing page.

**Edge case:** Multiple messages sharing the exact same `createdAt` may collapse across a cursor boundary (exclusive `lt`). Acceptable for v1; compound cursors can follow later.

## Soft decline

`declineRequest` mutation — see `docs/GIGASOCIAL_DM_PHASE2E.md`.
