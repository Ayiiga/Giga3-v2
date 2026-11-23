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

`<CONVEX_SITE_URL>/auth/oauth/callback`

## Provider setup checklist

Use the social sign-in credentials below. Do not reuse `*_CONNECTOR_*` secrets.

1. Confirm the active Convex deployment site URL (the `*.convex.site` host) and set `CONVEX_SITE_URL` plus `FRONTEND_URL=https://www.giga3ai.com`.
2. Register the exact callback URL `<CONVEX_SITE_URL>/auth/oauth/callback` in each provider's developer console.
3. Apple: create/enable a Sign in with Apple Services ID, associate the website domain and return URL, create a Sign in with Apple key, then set the Services ID as `AUTH_APPLE_CLIENT_ID` and the Team ID, Key ID and `.p8` private key in the other Apple variables.
4. Microsoft: create an Entra ID app registration, add a Web redirect URI, create a client secret, and set the application (client) ID and secret. Choose `AUTH_MICROSOFT_TENANT=common` for supported personal/work accounts or the intended tenant ID for a restricted deployment.
5. GitHub: create an OAuth App, set its Authorization callback URL to the same Convex callback, and set its client ID and client secret.
6. Set the secrets on the production Convex deployment (not only local `.env`), then deploy the Convex functions.
7. Open Settings → Linked sign-in providers. A provider becomes linkable only after its credentials and callback are available. Test provider consent, callback, verified identity and final linked status.

Do not paste private keys or client secrets into chat, source code, screenshots, or frontend environment variables. Use the Convex dashboard or `npx convex env set KEY` from an authenticated project environment.

## Account linking

- Stable key: `(provider, subject)` in `authProviderIdentities` (Google also keeps `users.googleSub` for legacy)
- **Never** auto-merge because emails match
- Existing email without this provider → reject `account_exists_requires_link`
- Explicit link: signed-in session + verified provider identity whose email matches the session account (Settings → Linked sign-in providers)

## Ops readiness

`socialAuth/status:getSocialAuthDeploymentReadiness` — reports configured flags and missing env **key names** only.

## Smoke checklist (after secrets)

1. Deploy Convex with schema + `socialAuth/*` modules.
2. Set provider secrets; register redirect URI.
3. New user: each provider → account created → session → credits/wallet intact path.
4. Repeat login by subject.
5. Existing password account + same email social → blocked until Settings link.
6. Invalid/expired callback → `auth_error` on login.
7. Logout / `sessionsValidAfter` still revoke sessions.
