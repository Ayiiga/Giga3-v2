# Giga3 Connectors

External integrations for Automation → Integrations. Platform modules (Chat, Media, GigaLearn, Marketplace) are always Active as first-party links. External providers are **never** marked Active/Connected unless Convex credentials exist and (for Connected) the user has completed authorisation.

> **Security boundary:** Connector OAuth authorises Giga3 to call an external API on behalf of an already-signed-in user. It is **not** user authentication. Social sign-in (Google / Apple / Microsoft / GitHub login) uses separate credentials, callbacks (`/auth/oauth/callback`), scopes, and records. Never reuse `*_CONNECTOR_*` secrets for login, or login secrets for connectors.

## Architecture

- Adapter registry: `convex/connectors/registry.ts`
- Encrypted token store: `connectorConnections` (AES-GCM via `CONNECTOR_TOKEN_ENCRYPTION_KEY` or `SESSION_SIGNING_SECRET`)
- OAuth callback: `https://<deployment>.convex.site/connectors/oauth/callback`
- Operations: `connectors/operations.invoke` (confirmation staging for consequential actions)
- UI: `web/components/automation/ConnectorsPanel.tsx`
- Ops readiness (no secrets): `connectors/status.getConnectorDeploymentReadiness`

Tokens, refresh tokens, and client secrets never leave Convex. Do not put connector secrets in `NEXT_PUBLIC_*` or Cloudflare Pages.

## Environment variables (Convex)

| Variable | Providers |
|----------|-----------|
| `CONNECTOR_TOKEN_ENCRYPTION_KEY` | All (recommended dedicated key; do **not** rotate without a credential migration plan) |
| `GOOGLE_CONNECTOR_CLIENT_ID` | Drive, Gmail |
| `GOOGLE_CONNECTOR_CLIENT_SECRET` | Drive, Gmail |
| `MICROSOFT_CONNECTOR_CLIENT_ID` | Outlook Calendar |
| `MICROSOFT_CONNECTOR_CLIENT_SECRET` | Outlook Calendar |
| `MICROSOFT_CONNECTOR_TENANT` | Optional (default `common`) |
| `ZOOM_CONNECTOR_CLIENT_ID` | Zoom |
| `ZOOM_CONNECTOR_CLIENT_SECRET` | Zoom |
| `NOTION_CONNECTOR_CLIENT_ID` | Notion |
| `NOTION_CONNECTOR_CLIENT_SECRET` | Notion |
| `FRONTEND_URL` | OAuth return redirects (production: `https://www.giga3ai.com`) |
| `CONVEX_SITE_URL` | OAuth redirect URI base (`https://perfect-lark-521.convex.site`) |

Moodle uses a **per-user** site URL + personal web-service token (no platform admin password). Site URLs must be `https://` and must not target localhost, private, or link-local hosts. Before connect, the hostname is DNS-resolved and **every** resolved address is checked against the private/link-local/CGNAT/multicast denylist; HTTPS then connects to the pinned public IP with `Host`/`SNI` set to the original hostname (connection-time destination enforcement). 3xx responses are rejected (no redirect follow). Response bodies are size-capped (~1 MiB) under the request timeout. Remaining residual risk: OS/TLS stack behaviour outside our pin path is assumed standard Node `https.request`.

Consequential operations stage a `connectorPendingActions` row; confirm claims that row and executes the locked payload only (idempotent replay returns the stored result if already executed).

## OAuth redirect URI

Register this exact redirect on each provider console:

`https://perfect-lark-521.convex.site/connectors/oauth/callback`

(or your deployment’s `*.convex.site` host)

### Provider console checklist (owner)

| Provider | Console | App type | Redirect URI | Notes |
|----------|---------|----------|--------------|-------|
| Google Drive / Gmail | Google Cloud Console → OAuth client | Web | Convex `/connectors/oauth/callback` | Enable Drive API + Gmail API. Restricted Gmail scopes may need verification. |
| Outlook Calendar | Microsoft Entra → App registration | Web | Same callback | API permissions: `Calendars.Read`, `Calendars.ReadWrite`, `openid`, `email`, `offline_access`. |
| Zoom | Zoom Marketplace → OAuth app | User-managed | Same callback | Scopes match registry (`meeting:*`, `user:read:user`). |
| Notion | Notion → Public integration | OAuth | Same callback | Capabilities granted at install time. |
| Moodle | N/A (per-user token) | — | — | User pastes site HTTPS URL + personal web-service token. |

After creating each app, set the matching `*_CONNECTOR_*` secrets on Convex production (`perfect-lark-521`) via Dashboard or `npx convex env set` with a deploy key. Never commit secrets.

## Ops readiness query

Call `connectors:getConnectorDeploymentReadiness` (no auth required; returns **key names only**, never values):

- `oauthCallbackUrl` — must be non-null before any OAuth connect works
- `encryption.dedicatedKeyConfigured` / fallback note
- Per-provider `configured` + `missingEnvKeys[]`
- `readyProviderCount` / `needsConfigurationCount`

Unconfigured providers surface **Needs configuration** in Automation → Integrations. Connected is only returned after a verified token exchange and encrypted store write.

## Scopes

See `EXTERNAL_CONNECTORS` in `convex/connectors/registry.ts`.

### Google verification

Gmail `gmail.send` / `gmail.compose` and Drive sensitive scopes may require Google OAuth app verification for production users outside the test-user list. Until approved, keep the Google Cloud project in testing mode and add testers, or the UI correctly shows connection failures / needs configuration.

## Status meanings

| Status | Meaning |
|--------|---------|
| Active | First-party Giga3 module |
| Available to connect | Server credentials present; user not connected |
| Connected | User authorised; tokens stored encrypted |
| Needs configuration | Missing Convex env secrets |
| Needs reauthorisation | Refresh failed / revoked |
| Temporarily unavailable | Connection error state |

## Smoke checklist (after secrets)

1. Deploy Convex with schema + connector modules.
2. Set provider secrets on Convex (see table above). Confirm `getConnectorDeploymentReadiness` shows `configured: true` per provider.
3. Sign in → Automation → Integrations → Connect.
4. Complete provider consent → land on integrations with `connector_connected=…`.
5. Invoke a read operation via Manage / server `connectors/operations.invoke`.
6. Stage a send/create action → confirm with `pendingActionId` → verify provider side.
7. Disconnect and confirm tokens removed.

Live OAuth smoke is **blocked** until the owner supplies the `*_CONNECTOR_*` client credentials and registers the redirect URI. Do not invent smoke results.
