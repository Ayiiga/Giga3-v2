# Security Fixes (Audit Remediation)

This document records security hardening applied after the merged-PR audit (PRs #71–#80).

## 1. Secure upload APIs (PR #76)

### Changes
- Added HMAC-signed session tokens (`convex/sessionAuth.ts`).
- `getUploadUsageSnapshot` now requires `sessionToken` and derives the user email from the verified token.
- Direct client calls to `recordUploads` are blocked; uploads are recorded only via `recordUploadsInternal` from authenticated `platformActions.sendMessage`.
- `requireAuthenticatedEmail()` (`convex/auth.ts`) ignores spoofed `userId` unless it matches the token (403 on mismatch).

### Why it helps
Prevents IDOR attacks where an attacker passed another user's email to exhaust quotas or read upload usage.

### Client updates
- Session token stored in `localStorage` (`giga3_session_token`) on login via `users.createUser`.
- Web chat hooks pass `sessionToken` to secured Convex calls.

## 2. Server-side upload validation (PR #76)

### Changes
- `convex/attachmentValidation.ts` measures actual payload size:
  - Base64 `dataUrl` decoded byte length for images
  - UTF-8 byte length for text fields
- Rejects under-reported `sizeBytes` (payload larger than declared).
- Enforces MIME allowlist for images, max text size, blocked dangerous extensions.
- `platformActions.sendMessage` validates attachments before quota accounting.

### Why it helps
Stops attackers from sending `sizeBytes: 1` with multi-megabyte payloads to bypass limits and abuse LLM providers.

## 3. Protect internal monitoring data (PR #77)

### Changes
- Removed `qualityMonitoring` from `platformActions.sendMessage`, `regenerateMessage`, and `aiActions.askAI` responses.
- Metrics still recorded server-side via `recordQualityObservation()` and `qualityDashboard.recordResponseMetric`.

### Why it helps
Platform-wide analytics (hallucination rates, confidence rates) are no longer exposed to every chat client.

## 4. Harden feedback endpoint (PR #78)

### Changes
- `recordUserFeedback` accepts optional `sessionToken` (authenticated submissions preferred).
- Per-user and per-IP-hash rate limiting via `feedbackRateLimits` table.
- Duplicate submission detection within 5 minutes.
- Note sanitization strips HTML/control characters (max 500 chars).
- Suspicious rate-limit events logged with `[security.feedback]`.

### Why it helps
Reduces spam, storage abuse, and polluted admin analytics.

## 5. Secure Mermaid rendering (PR #80)

### Changes
- Kept `securityLevel: "strict"` in Mermaid config.
- Added `sanitizeMermaidSvg()` allowlist sanitizer before DOM insertion.
- Replaced `innerHTML` with `replaceChildren` + `template` parsing.
- Added Content-Security-Policy in `web/public/_headers`.

### Why it helps
Defense-in-depth against XSS if Mermaid output or model-generated diagram syntax is malicious.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `SESSION_SIGNING_SECRET` | HMAC key for session tokens (falls back to `ADMIN_SETTINGS_KEY` in dev only) |
| `SESSION_SIGNING_SECRET_PREVIOUS` | Previous HMAC key during rotation |
| `SESSION_SIGNING_KEY_ID` | Optional key id embedded in tokens |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Magic-link JWT verification |

Set in Convex production:

```bash
npx convex env set SESSION_SIGNING_SECRET "<long-random-secret>"
```

## Tests

```bash
npm run test:security
```

Covers attachment validation, session auth, auth helpers, and Mermaid SVG sanitization.

## Remaining risks

| Risk | Severity | Notes |
|------|----------|-------|
| Convex-path email login without mailbox proof | Medium | Use Supabase magic-link in production; rate-limited bootstrap |
| CSP allows `unsafe-inline` scripts/styles | Low | Required for Next.js static export; `unsafe-eval` replaced with `wasm-unsafe-eval` |
| `quality` per-response report still returned | Low | Per-message metadata, not platform aggregates |

See **`docs/DEPLOYMENT_SECURITY_REPORT.md`** for the full OWASP Top 10 audit and deployment checklist.

## Backward compatibility

- `userId`/`email` args retained on actions for client routing; server derives identity from `sessionToken`.
- Existing users receive a session token on next `createUser` / login.
- Upload usage UI continues to work once session token is present.
