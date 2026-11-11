# Giga3 Social Sign-up / Login

User authentication via Google, Apple, Microsoft, and GitHub.

> **Security boundary:** This is **not** connector OAuth. Connector credentials use `*_CONNECTOR_*` env keys and `/connectors/oauth/callback`. Social login uses `AUTH_*` / `GOOGLE_CLIENT_ID` and `/auth/oauth/callback`. Sharing an identity vendor does not make the flows interchangeable.

## Reused infrastructure

- Session minting: `createSessionToken` / `requireSession` (`giga3.v1`)
- User upsert: `users.ensureUserInternal` (verified flows only)
- Existing Google Identity Services path: `googleAuthActions:signInWithGoogle`
- Password auth unchanged

## Providers

| Provider | Flow | Convex env (names) | Client |
|----------|------|--------------------|--------|
| Google | GIS ID token → verify JWKS → session | `GOOGLE_CLIENT_ID` (also accepts `AUTH_GOOGLE_CLIENT_ID` / `AUTH_GOOGLE_ID`) | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |
| Apple | OAuth + form_post + OIDC id_token (nonce) | `AUTH_APPLE_CLIENT_ID`, `AUTH_APPLE_TEAM_ID`, `AUTH_APPLE_KEY_ID`, `AUTH_APPLE_PRIVATE_KEY` | Redirect buttons |
| Microsoft | OAuth + PKCE + OIDC id_token (nonce) | `AUTH_MICROSOFT_CLIENT_ID`, `AUTH_MICROSOFT_CLIENT_SECRET`, optional `AUTH_MICROSOFT_TENANT` | Redirect buttons |
| GitHub | OAuth + PKCE + `/user` + verified email | `AUTH_GITHUB_CLIENT_ID`, `AUTH_GITHUB_CLIENT_SECRET` | Redirect buttons |

Shared: `FRONTEND_URL`, `CONVEX_SITE_URL`, `SESSION_SIGNING_SECRET`

Redirect URI (all redirect providers):

`https://perfect-lark-521.convex.site/auth/oauth/callback`

## Account linking

- Stable key: `(provider, subject)` in `authProviderIdentities` (Google also keeps `users.googleSub` for legacy)
- **Never** auto-merge because emails match
- Existing email without this provider → reject `account_exists_requires_link`
- Explicit link: signed-in session + verified provider identity whose email matches the session account (Settings → Linked sign-in providers)

## Production setup checklist

Before showing a provider as linkable, configure its server-side credentials on the production Convex deployment:

- **Apple:** create a Sign in with Apple Services ID and key; set `AUTH_APPLE_CLIENT_ID`, `AUTH_APPLE_TEAM_ID`, `AUTH_APPLE_KEY_ID`, and `AUTH_APPLE_PRIVATE_KEY`.
- **Microsoft:** create an Entra web app registration; set `AUTH_MICROSOFT_CLIENT_ID` and `AUTH_MICROSOFT_CLIENT_SECRET`. Set `AUTH_MICROSOFT_TENANT` only when a tenant restriction is intentional.
- **GitHub:** create a GitHub OAuth App; set `AUTH_GITHUB_CLIENT_ID` and `AUTH_GITHUB_CLIENT_SECRET`.
- **Google:** set `GOOGLE_CLIENT_ID` on Convex and the matching `NEXT_PUBLIC_GOOGLE_CLIENT_ID` on the web build.

Register this exact social-auth callback for Apple and Microsoft:

`https://perfect-lark-521.convex.site/auth/oauth/callback`

GitHub OAuth App callback URL must use the same address. Do not substitute the connector callback path. After changing Convex variables, deploy Convex functions and check `getSocialAuthDeploymentReadiness`. The Settings page disables unconfigured providers instead of allowing users to hit a server-side UnauthorizedError.



`socialAuth/status:getSocialAuthDeploymentReadiness` — reports configured flags and missing env **key names** only.

## Smoke checklist (after secrets)

1. Deploy Convex with schema + `socialAuth/*` modules.
2. Set provider secrets; register redirect URI.
3. New user: each provider → account created → session → credits/wallet intact path.
4. Repeat login by subject.
5. Existing password account + same email social → blocked until Settings link.
6. Invalid/expired callback → `auth_error` on login.
7. Logout / `sessionsValidAfter` still revoke sessions.
