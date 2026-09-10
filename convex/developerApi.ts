import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Giga3-Api-Key",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
    },
  });
}

function extractApiKey(request: Request): string | null {
  const auth = request.headers.get("Authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  return request.headers.get("X-Giga3-Api-Key")?.trim() || null;
}

async function authenticateDeveloperKey(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  request: Request,
  requiredScope?: string
) {
  const rawKey = extractApiKey(request);
  if (!rawKey) {
    return { error: jsonResponse({ ok: false, error: "Missing API key." }, 401) };
  }

  const verified = await ctx.runAction(internal.apiKeysActions.verifyKeyInternal, {
    rawKey,
  });
  if (!verified) {
    return { error: jsonResponse({ ok: false, error: "Invalid or revoked API key." }, 401) };
  }
  if (requiredScope && !verified.scopes.includes(requiredScope)) {
    return { error: jsonResponse({ ok: false, error: "Insufficient scope." }, 403) };
  }

  await ctx.runMutation(internal.apiKeys.recordUsageInternal, {
    apiKeyId: verified.apiKeyId,
    userId: verified.userId,
  });

  return { verified };
}

/** Public liveness + scope discovery for user API keys. */
export const developerApiHealth = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const auth = await authenticateDeveloperKey(ctx, request);
  if ("error" in auth && auth.error) {
    return jsonResponse(
      {
        ok: true,
        service: "giga3-developer-api",
        version: "v1",
        auth: "required",
        endpoints: ["GET /api/v1/health", "GET /api/v1/me"],
      },
      200
    );
  }

  return jsonResponse({
    ok: true,
    service: "giga3-developer-api",
    version: "v1",
    keyPrefix: auth.verified?.keyPrefix,
    scopes: auth.verified?.scopes,
  });
});

export const developerApiMe = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const auth = await authenticateDeveloperKey(ctx, request, "chat:read");
  if ("error" in auth && auth.error) return auth.error;

  return jsonResponse({
    ok: true,
    userId: auth.verified!.userId,
    keyPrefix: auth.verified!.keyPrefix,
    scopes: auth.verified!.scopes,
  });
});
