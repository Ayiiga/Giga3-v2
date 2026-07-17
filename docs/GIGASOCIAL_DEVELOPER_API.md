# GigaSocial Developer API

Read-only HTTP API for integrating public GigaSocial content into third-party apps.

## Base URL

```
https://perfect-lark-521.convex.site/gigasocial/api/v1
```

Production Convex site URL may vary per deployment. The web docs page at `/developers/` resolves the current base URL at build time.

## Authentication

Set `GIGASOCIAL_DEVELOPER_API_KEY` on the Convex deployment:

```bash
npx convex env set GIGASOCIAL_DEVELOPER_API_KEY "gs_dev_…"
```

Pass the key on protected requests:

```
Authorization: Bearer YOUR_API_KEY
```

or

```
X-Giga3-Api-Key: YOUR_API_KEY
```

- **Rate limit:** 120 requests / hour / key (sliding window via `feedbackRateLimits`)
- **CORS:** `Access-Control-Allow-Origin: *` on all responses

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Liveness + endpoint list |
| GET | `/post?id={postId}` | Yes | Single public post |
| GET | `/feed` | Yes | Feed (`limit`, `cursor`, `community`) |
| GET | `/discover` | Yes | Discover (`filter`, `q`, `limit`) |
| GET | `/profile?handle={handle}` | Yes | Profile + recent posts |
| GET | `/comments?postId={postId}` | Yes | Post comments |

## Example

```bash
curl -s \
  -H "Authorization: Bearer YOUR_API_KEY" \
  "https://perfect-lark-521.convex.site/gigasocial/api/v1/feed?limit=5"
```

## Response shape

Success:

```json
{ "ok": true, "posts": [], "nextCursor": null }
```

Error:

```json
{
  "ok": false,
  "error": { "code": "unauthorized", "message": "Invalid or missing API key." }
}
```

## Implementation

- Routes: `convex/http.ts`
- Handlers: `convex/gigaSocialDeveloperApi.ts`
- Rate limits: `convex/gigaSocialDeveloperApiRateLimit.ts`
- Delegates to existing `gigaSocial` queries (`listFeed`, `getPublicPost`, etc.)

## Web docs

Human-readable docs: `https://www.giga3ai.com/developers/`
