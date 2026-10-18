# Giga3 Connectors

External integrations for Automation → Integrations. Platform modules (Chat, Media, GigaLearn, Marketplace) are always Active as first-party links. External providers are **never** marked Active/Connected unless Convex credentials exist and (for Connected) the user has completed authorisation.

## Architecture

- Adapter registry: `convex/connectors/registry.ts`
- Encrypted token store: `connectorConnections` (AES-GCM via `CONNECTOR_TOKEN_ENCRYPTION_KEY` or `SESSION_SIGNING_SECRET`)
- OAuth callback: `https://<deployment>.convex.site/connectors/oauth/callback`
- Operations: `connectors/operations.invoke` (confirmation staging for consequential actions)
- UI: `web/components/automation/ConnectorsPanel.tsx`

Tokens, refresh tokens, and client secrets never leave Convex. Do not put connector secrets in `NEXT_PUBLIC_*` or Cloudflare Pages.

## Environment variables (Convex)

| Variable | Providers |
|----------|-----------|
| `CONNECTOR_TOKEN_ENCRYPTION_KEY` | All (recommended dedicated key) |
| `GOOGLE_CONNECTOR_CLIENT_ID` | Drive, Gmail |
| `GOOGLE_CONNECTOR_CLIENT_SECRET` | Drive, Gmail |
| `MICROSOFT_CONNECTOR_CLIENT_ID` | Outlook Calendar |
| `MICROSOFT_CONNECTOR_CLIENT_SECRET` | Outlook Calendar |
| `MICROSOFT_CONNECTOR_TENANT` | Optional (default `common`) |
| `ZOOM_CONNECTOR_CLIENT_ID` | Zoom |
| `ZOOM_CONNECTOR_CLIENT_SECRET` | Zoom |
| `NOTION_CONNECTOR_CLIENT_ID` | Notion |
| `NOTION_CONNECTOR_CLIENT_SECRET` | Notion |
| `FRONTEND_URL` | OAuth return redirects |
| `CONVEX_SITE_URL` / site URL | OAuth redirect URI base |

Moodle uses a **per-user** site URL + personal web-service token (no platform admin password). Site URLs must be `https://` and must not target localhost, private, or link-local hosts (SSRF guard).

Consequential operations stage a `connectorPendingActions` row; confirm claims that row and executes the locked payload only (idempotent replay returns the stored result if already executed).

## OAuth redirect URI

Register this exact redirect on each provider console:

`https://perfect-lark-521.convex.site/connectors/oauth/callback`

(or your deployment’s `*.convex.site` host)

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
2. Set provider secrets on Convex.
3. Sign in → Automation → Integrations → Connect.
4. Complete provider consent → land on integrations with `connector_connected=…`.
5. Invoke a read operation via Manage / server `connectors/operations.invoke`.
6. Stage a send/create action → confirm with `pendingActionId` → verify provider side.
7. Disconnect and confirm tokens removed.
