# Google Play — child audience / UGC checklist (owner)

**Do not treat this as compliance certification.** Code changes reduce risk; Console declarations and legal review remain owner responsibilities.

## Target audience

- [ ] Confirm in Play Console whether under-13 is an intended audience (product includes GigaLearn for school-age children).
- [ ] If under-13 is selected, complete **Families Policy** questionnaire honestly — do not change audience only to clear a warning.
- [ ] If Families Policy applies, complete all required Families declarations and reviews.

## Data safety

- [ ] Disclose collection of birth month/year for age gating.
- [ ] Disclose AI chat content processing by third-party providers.
- [ ] Disclose account email, optional profile/media for older users.
- [ ] Align form answers with `web/lib/legal/content.ts` and live product behavior.

## Privacy & deletion

- [ ] Privacy policy URL live: `https://www.giga3ai.com/legal/privacy/`
- [ ] Account deletion URL live: `https://www.giga3ai.com/legal/delete-account/`
- [ ] Confirm self-delete path works on a test account after deploy.

## User-generated content

- [ ] Declare UGC (GigaSocial posts/comments/DMs when enabled).
- [ ] Document report + block + moderation process (queue tables exist; staffing required).
- [ ] Confirm DM feature flag state in production (`GIGASOCIAL_DM_ENABLED`).

## AI-generated content

- [ ] Declare AI-generated content where required by current Play policy.
- [ ] Note child-safety filters are heuristic — not a guarantee of zero harmful output.

## Ads / SDKs

- [ ] Declare whether ads are shown (current TWA/PWA: confirm live behavior).
- [ ] List analytics / push / payment SDKs accurately.

## Content rating

- [ ] Complete IARC questionnaire reflecting education + social + AI features.

## Outstanding non-code blockers

1. Legal review of parental consent / notification for under-13 markets.
2. Staffed moderation for `socialContentReports` / `unsafe_ai` / DM reports.
3. Digital Asset Links production deploy (separate Play TWA track).
4. Explicit approval before Play upload of versionCode 3 AAB.
