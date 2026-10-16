# GigaSocial Phase 2D — Direct Messaging UI

**Branch pattern:** `cursor/gigasocial-phase2d-dm-ui-161d`  
**Depends on:** Phase 2C tip `42934e5437c8a9ea4443fda6480e4de01e17198c`  
**Flags:** `NEXT_PUBLIC_GIGASOCIAL_DM=false` (default), Convex `GIGASOCIAL_DM_ENABLED` unset/false  

## What shipped

- Distinct Messages section; Inbox stays notifications
- Thread list, conversation, composer, accept / decline&block, block, report
- en/fr strings, a11y labels, offline/error/retry/loading/empty states
- Client-only unread dots (localStorage)

## Actual APIs used (Phase 2C + soft decline)

`listMyThreads`, `getThread`, `listThreadMessages`, `sendMessage`, `acceptRequest`, `declineRequest`, `blockUser`, `reportMessage`, `getDmFoundationStatus`

Deep links: `/gigasocial/?tab=messages&to=<userId>` (compose) and `&thread=<threadId>` (open via `getThread`).

Still client-only: unread dots (localStorage). Server mark-read / unread badge query not shipped.

## Known limitations

See `docs/GIGASOCIAL_DM_M1_M2_BACKEND.md`.

## Release gate

1. Merge Phase 2C (+ codegen on deploy)
2. Land M1/M2 backend PR
3. QA with flags on non-prod only
4. Explicit approval before enabling either flag in production
