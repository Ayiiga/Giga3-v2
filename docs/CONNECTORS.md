# Giga3 Connectors

External integrations for Automation → Integrations. Platform modules (Chat, Media, GigaLearn, Marketplace) are always Active as first-party links. External providers are **never** marked Active/Connected unless Convex credentials exist and (for Connected) the user has completed authorisation.

> **Security boundary:** Connector OAuth authorises Giga3 to call an external API on behalf of an already-signed-in user. It is **not** user authentication. Social sign-in uses separate credentials (`AUTH_*` / `GOOGLE_CLIENT_ID`), callback (`/auth/oauth/callback`), and records. Never reuse `*_CONNECTOR_*` secrets for login.

## Architecture

- Adapter registry: `convex/connectors/registry.ts`
- Encrypted token store: `connectorConnections` (AES-GCM via `CONNECTOR_TOKEN_ENCRYPTION_KEY` or `SESSION_SIGNING_SECRET`)
- OAuth callback: `https://<deployment>.convex.site/connectors/oauth/callback`
- Operations: `connectors/operations.invoke` (confirmation staging for consequential actions)
- UI: `web/components/automation/ConnectorsPanel.tsx`
- Ops readiness (no secrets): `connectors/status.getConnectorDeploymentReadiness`
- Moodle URL validation (pure): `convex/connectors/moodleUrl.ts`

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

### Moodle (per-user, no platform OAuth secrets)

Users supply:

1. Public **HTTPS** Moodle site URL (bare hostnames are normalized to `https://…`; trailing slashes trimmed).
2. Personal Moodle **web-service token** (not an admin password).

Rejected: HTTP, credentials in URL, fragments, localhost/private/link-local/metadata hosts, unsupported schemes. After URL validation, DNS is resolved and every address is checked; HTTPS connects to the pinned public IP with `Host`/`SNI` set to the original hostname. 3xx redirects rejected. Response bodies size-capped (~1 MiB).

## OAuth redirect URI

Register this exact redirect on each provider console:

`https://perfect-lark-521.convex.site/connectors/oauth/callback`

### Provider console checklist (owner)

| Provider | Console | Redirect URI | Convex secrets |
|----------|---------|--------------|----------------|
| Google Drive / Gmail | Google Cloud OAuth **web** client + consent screen | Convex `/connectors/oauth/callback` on the **connector** client | `GOOGLE_CONNECTOR_*` only (not GIS `GOOGLE_CLIENT_ID`). If consent screen is **Testing**, only listed test users can connect; others see `access_denied` / verification messaging until Google verification is completed in Console. |
| Outlook Calendar | Entra app registration | Same | `MICROSOFT_CONNECTOR_*` (not `AUTH_MICROSOFT_*`). Supported accounts: **any org directory + personal Microsoft accounts**. Leave `MICROSOFT_CONNECTOR_TENANT` unset (`/common`). Setting `organizations` or a tenant GUID causes `unauthorized_client` for personal MSA. Delegated Graph: `User.Read`, `Calendars.ReadWrite`. |
| Zoom | Zoom Marketplace OAuth app | Same | `ZOOM_CONNECTOR_*` |
| Notion | Notion public integration | Same | `NOTION_CONNECTOR_*` |
| Moodle | N/A | N/A | Per-user URL + token |

## Ops readiness query

`connectors:getConnectorDeploymentReadiness` returns callback URL, encryption key presence, and per-provider `configured` + `missingEnvKeys` (**names only**). Unconfigured providers show **Needs configuration** in the UI. Connected is only returned after a verified token exchange.

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
2. Set provider secrets on Convex. Confirm readiness query shows `configured: true`.
3. Sign in → Automation → Integrations → Connect.
4. Complete provider consent → land on integrations with `connector_connected=…`.
5. Moodle: enter HTTPS URL + personal token → Connecting… → Connected only after site-info succeeds.
6. Invoke a read operation via Manage / server `connectors/operations.invoke`.
7. Stage a send/create action → confirm with `pendingActionId` → verify provider side.
8. Disconnect and confirm tokens removed.

Live OAuth smoke is blocked until the owner supplies `*_CONNECTOR_*` credentials. Do not invent smoke results.
