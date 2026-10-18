# AI Executive Assistant — Connector Orchestration

Additive layer on PR #536 connectors. Does not replace chat routing, billing, or connector adapters.

## Flow

1. User submits a natural-language goal (Automation → Assistant, or Discover → Executive Assistant).
2. Server builds a structured plan (`assistantOrchestrationPlans`) with ordered steps.
3. Each step names a connector provider + operation + params.
4. Missing connections are reported; no step invents a successful API call.
5. Read-only steps may auto-run when connections exist.
6. Consequential steps (send email, create event/meeting, write Drive/Notion) pause for confirmation.
7. On confirm, the engine calls existing `connectors/operations.invoke` with `confirm` + `pendingActionId`.
8. Progress and verifiable results are stored and shown in the UI.

## Safety

- Session-derived identity only (`requireSession(..., ctx)`).
- Cross-user isolation on every plan/step.
- External content treated as untrusted (reuse connector tool policy).
- Never mark a provider connected without a live connection row.
- Plans expire; cancelled / completed / failed plans do not re-execute (failed plans are rejected at the atomic claim boundary — `confirmStepId` cannot resume them).
- Confirmation claims the staged `connectorPendingActions` row atomically and runs that locked `payloadJson` only (client `params` / post-stage overrides cannot change the action).
- Step transitions are atomic server-side mutations with revision CAS; stale snapshots cannot overwrite running/completed/failed/awaiting state.
- Interrupted running steps use a lease: after expiry they may be reconciled to `failed` with “provider outcome unknown” (explicit action or on next advance). Never auto-retry the external operation.
- Operations are validated against the server-side connector allowlist.

## Files

- `convex/assistantOrchestrator/planner.ts` — pure NL → plan
- `convex/assistantOrchestrator/engine.ts` — plan/execute/confirm/cancel
- `web/components/automation/ExecutiveAssistantPanel.tsx` — UI
