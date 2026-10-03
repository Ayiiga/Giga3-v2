# Google Play release checklist (prepare only)

**Not submitted.** Use after internal testing approval.

## Pre-upload

- [ ] Package ID confirmed: `com.giga3ai.app` (Play Console availability checked by owner)
- [ ] Debug build passes (`cd android && ./gradlew assembleDebug`)
- [ ] Release AAB signed with approved upload key
- [ ] Digital Asset Links live at `https://www.giga3ai.com/.well-known/assetlinks.json` with **real** SHA-256
- [ ] TWA opens full-screen (not browser URL bar) on test device
- [ ] Billing policy decision documented (`billing-policy-review.md`)

## Store listing

- [ ] App name: Giga3 AI
- [ ] Short description (≤80 chars)
- [ ] Full description (≤4000 chars)
- [ ] App icon 512×512 (`web/public/icons/icon-512.png`)
- [ ] Feature graphic 1024×500 (**not in repo — create**)
- [ ] Phone screenshots (min 2)
- [ ] Tablet screenshots (recommended)
- [ ] Category selected
- [ ] Contact email
- [ ] Privacy policy URL: https://www.giga3ai.com/legal/privacy/

## Policy forms

- [ ] Data Safety questionnaire (match `web/lib/legal/content.ts` + actual Convex/Supabase behavior)
- [ ] Content rating (IARC)
- [ ] Target audience / ads declaration
- [ ] News / UGC / AI-generated content declarations as applicable

## Testing tracks

1. **Internal testing** — team emails, smoke test matrix
2. **Closed testing** — wider group, Paystack **test** mode only unless approved
3. **Production** — staged rollout after policy sign-off

## Smoke test matrix (device)

Core: launch, homepage, navigation, back button, reload  
Auth: login, logout, session restore, Google Sign-In  
Features: chat, GigaLearn, GigaSocial, marketplace, media  
Device: camera, mic, file upload, notifications (if enabled), location  
Network: offline page, slow network recovery  
Payments: **test/sandbox only** — no live charges without approval
