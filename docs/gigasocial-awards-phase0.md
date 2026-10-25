# GigaSocial Awards — Phase 0 implementation plan

Access date: **2026-10-25** (Africa/Accra). Branch base: `origin/main` @ `c4fc832f` (includes Creator Earnings Centre #605).

## Reuse (do not reinvent)

| Concern | Existing system |
| --- | --- |
| Sessions | `requireSession` in `convex/auth.ts` |
| Admin auth | `ensureAdminAccess` / `adminCredentialArgs` in `convex/adminAccess.ts` |
| Social profiles | `socialProfiles`, `socialFollows` |
| Tips / gifts (cash) | `initializeCreatorGiftPayment` + `fulfillCreatorGiftInternal` → `payoutBalanceGhs` |
| Paystack verification | `convex/paystack.ts` webhook `charge.success` — never trust browser redirect alone |
| Content reports | `socialContentReports` patterns |
| Notifications | `socialNotifications`, `platformNotifications` |
| Admin UI shell | `web/components/admin/AdminDashboardClient.tsx` |
| Marketing SEO pages | `publicMetadata` + `ProductSeoHeader` + static export under `web/app/(marketing)/` |
| Blog | Static posts in `web/content/blog/` + `web/lib/blog/categories.ts` (no Convex CMS) |
| Creator tools nav | GigaSocial `?tab=creator` + Earnings Centre |

## New data models (Convex)

- `awardsSeasons` — season config, windows, publication flags, feature toggles (tips/packages/live)
- `awardsCategories` — per-season categories, eligibility, scoring formula (immutable after voting opens)
- `awardsNominations` — apply/nominate, consent, moderation status
- `awardsCandidates` — approved public profiles, display code `GSA-YYYY-#####`, share token
- `awardsVotes` — one row per (voter, category, season) with rate-limit metadata
- `awardsJudgeScores` — independent judging components
- `awardsAssessmentScores` — category assessment components
- `awardsPromoPackages` — configurable GH₵ packages (default Free/20/50/100)
- `awardsPromoOrders` — package purchases (pending until Paystack verify; **payments disabled by default**)
- `awardsSponsors` / `awardsPrizes` — sponsorship + prize register (`advertisable` only when funded/contracted)
- `awardsAuditLog` — scoring formula changes, admin publishes, disqualifications

## AuthZ

- Public reads: published seasons, categories, candidate public cards, published results only.
- Session required: nominate, accept/decline, vote, edit own draft.
- Admin credentials required: season/category CRUD, approve nominations, open/close voting, publish results, packages/sponsors/prizes, investigations.
- Display codes are **not** credentials — vote/write ops use session + server eligibility.

## Payments / balances

- **Packages:** schema + admin config + order records; checkout gated by `season.promoPaymentsEnabled` (default `false`). When enabled later, reuse Paystack initialize + webhook verification; packages must never write votes/scores.
- **Tips:** reuse existing creator tip flow when `season.tipsEnabled`; UI discloses tips ≠ votes. No awards-specific payout inventing; no Transfers.
- **Prizes:** advertise only when `awardsPrizes.advertisable === true`.

## Static export

- Marketing pages: `/gigasocial/awards/`, `/gigasocial/awards/nominate/`, `/gigasocial/awards/candidate/` (code via `?code=` query — avoids unbounded SSG).
- Dynamic data via Convex client hooks (same as GigaSocial).
- No Next.js server routes.

## Migrations / deploy

1. Merge PR → Cloudflare Pages (frontend).
2. Deploy Convex with new tables **before** relying on nominations in production.
3. Do **not** publish a live season until admin creates one and legal/payment gates clear.

## Risks

- Vote fraud / botting — mitigate with session + one vote per category + rate windows + audit fields; not CAPTCHA v1.
- Accidental prize advertising — `advertisable` gate.
- Payment activation without ops readiness — feature flags default off.
- Legal (minors, competitions, tax) — documented blockers; no live season in this PR.

## Acceptance tests (automated)

- Formula normalisation and People’s Choice voting-only path.
- Duplicate vote rejection; outside voting window rejection.
- Nomination consent required before publish.
- Package purchase cannot mutate scores (source + unit).
- Admin mutations require credentials.
- Static routes present in export; production build green.
