# Phase 1–4 Validation Evidence (Staging)

Recorded on branch `cursor/phase1-4-staging-release-bde5` against `main` @ `e0be4fb` (merge base at cut).

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Unit / integration | `npm test` | **306 passed** / 72 files |
| Lint | `cd web && npm run lint` | Pass (pre-existing warnings only) |
| Production build | `cd web && NEXT_PUBLIC_CONVEX_URL=https://perfect-lark-521.convex.cloud npm run build` | Pass → `web/out` |
| SW identity | `tests/pwa/serviceWorkerCache.test.ts` | `giga3-shell-v170-production-readiness` |
| Social rate limit | `tests/security/socialRateLimit.test.ts` | Pass |
| Admin await hygiene | `tests/security/adminAccessAwait.test.ts` | Pass |
| Telemetry default-off | `tests/observability/clientTelemetry.test.ts` | Pass |
| Phase 3 growth helpers | `tests/gigasocial/phase3CommunitiesGrowth.test.ts` | Pass |

## Static audit

| Item | Result |
|------|--------|
| `convex/schema.ts` diff | None |
| Dependency / lockfile diff | None |
| Secrets in diff | None found |
| Final SW | v170 + wallet/admin sensitive |

## Manual / production (pending human Stage 1–2)

See checklist in `docs/PHASE_1_4_STAGING_RELEASE.md`. This Cloud Agent cannot complete live production auth/payment/device tests against `*.convex.cloud` from this VM.
