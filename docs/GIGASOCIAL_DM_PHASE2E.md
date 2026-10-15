# GigaSocial Phase 2E — DM backend hardening

**Branch:** `cursor/gigasocial-phase2e-dm-backend-hardening-161d`  
**Base:** Phase 2C `cursor/gigasocial-phase2c-dm-schema-auth-161d` @ `42934e5`  
**Dependency:** Phase 2C is **not** on `main` — this PR stacks on #521 and must not be merged before the foundation.

## Scope

1. **M1** — Server block enforcement on list/history/send/accept  
2. **M2** — Index-range pagination for `listThreadMessages`  
3. **`declineRequest`** — Soft decline without auto-block  

No UI changes in this PR. Phase 2D can keep Decline & block → `blockUser` until a follow-up UI PR calls `declineRequest`.

## Flags

Keep disabled:

- `GIGASOCIAL_DM_ENABLED` (authoritative server control)  
- `NEXT_PUBLIC_GIGASOCIAL_DM`  

## Files

- `convex/gigaSocialDm.ts`  
- `convex/gigaSocialDmPolicy.ts`  
- `tests/gigasocial/gigaSocialDmHardening.test.ts`  
- `tests/gigasocial/gigaSocialDmFoundation.test.ts`  
- Docs under `docs/GIGASOCIAL_DM_*`  

## Remaining blockers for non-prod QA

1. Merge / deploy Phase 2C schema + module (or deploy this stack including 2C).  
2. Land Phase 2D UI (optional for API-only QA).  
3. Follow-up UI PR to call `declineRequest` for soft decline.  
4. Enable flags **only** on a non-production Convex deployment for E2E.  
5. Optional: compound cursor if same-ms message collisions appear in QA.  
