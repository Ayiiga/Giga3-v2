import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { RateLimitError } from "./securityErrors";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Giga3-Api-Key",
};

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {}
) {
  return jsonResponse({ ok: false, error: { code, message, ...extra } }, status);
}

function extractApiKey(request: Request): string | null {
  const auth = request.headers.get("Authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  const headerKey = request.headers.get("X-Giga3-Api-Key")?.trim();
  return headerKey || null;
}

function requireConfiguredApiKey(request: Request): string {
  const expected = process.env.GIGASOCIAL_DEVELOPER_API_KEY?.trim();
  if (!expected) {
    throw new Error("GIGASOCIAL_DEVELOPER_API_KEY_NOT_CONFIGURED");
  }
  const provided = extractApiKey(request);
  if (!provided || provided !== expected) {
    throw new Error("INVALID_API_KEY");
  }
  return provided;
}

async function withDeveloperAuth(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  request: Request,
  handler: () => Promise<Response>
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let apiKeyId: string;
  try {
    apiKeyId = requireConfiguredApiKey(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    if (message === "GIGASOCIAL_DEVELOPER_API_KEY_NOT_CONFIGURED") {
      return errorResponse(
        503,
        "api_not_configured",
        "GigaSocial developer API is not configured on this deployment."
      );
    }
    return errorResponse(401, "unauthorized", "Invalid or missing API key.");
  }

  try {
    await ctx.runMutation(internal.gigaSocialDeveloperApiRateLimit.consumeDeveloperApiRateLimitMutation, {
      apiKeyId,
    });
    return await handler();
  } catch (err) {
    if (err instanceof RateLimitError) {
      return errorResponse(429, "rate_limited", err.message);
    }
    console.error("[gigaSocialDeveloperApi]", err);
    return errorResponse(500, "internal_error", "Request failed.");
  }
}

/** Public liveness for the GigaSocial developer API surface. */
export const gigaSocialDeveloperApiHealth = httpAction(async () => {
  return jsonResponse({
    ok: true,
    service: "gigasocial-developer-api",
    version: "v1",
    ts: Date.now(),
    endpoints: [
      "GET /gigasocial/api/v1/health",
      "GET /gigasocial/api/v1/post?id=",
      "GET /gigasocial/api/v1/feed",
      "GET /gigasocial/api/v1/discover",
      "GET /gigasocial/api/v1/profile?handle=",
      "GET /gigasocial/api/v1/comments?postId=",
    ],
  });
});

export const gigaSocialDeveloperApiPost = httpAction(async (ctx, request) => {
  return withDeveloperAuth(ctx, request, async () => {
    const url = new URL(request.url);
    const postId = url.searchParams.get("id")?.trim();
    if (!postId) {
      return errorResponse(400, "missing_param", "Query parameter id is required.");
    }

    const post = await ctx.runQuery(api.gigaSocial.getPublicPost, {
      postId: postId as Id<"socialPosts">,
    });
    if (!post) {
      return errorResponse(404, "not_found", "Post not found or not public.");
    }
    return jsonResponse({ ok: true, post });
  });
});

export const gigaSocialDeveloperApiFeed = httpAction(async (ctx, request) => {
  return withDeveloperAuth(ctx, request, async () => {
    const url = new URL(request.url);
    const cursorRaw = url.searchParams.get("cursor");
    const limitRaw = url.searchParams.get("limit");
    const communitySlug = url.searchParams.get("community")?.trim() || undefined;
    const cursor = cursorRaw ? Number(cursorRaw) : undefined;
    const limit = limitRaw ? Number(limitRaw) : undefined;

    const result = await ctx.runQuery(api.gigaSocial.listFeed, {
      communitySlug,
      cursor: Number.isFinite(cursor) ? cursor : undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return jsonResponse({ ok: true, ...result });
  });
});

export const gigaSocialDeveloperApiDiscover = httpAction(async (ctx, request) => {
  return withDeveloperAuth(ctx, request, async () => {
    const url = new URL(request.url);
    const filter = url.searchParams.get("filter")?.trim() || undefined;
    const query = url.searchParams.get("q")?.trim() || undefined;
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;

    const allowedFilters = new Set([
      "trending",
      "recent",
      "education",
      "creator",
      "ai",
      "video",
      "photo",
      "music",
    ]);
    const safeFilter =
      filter && allowedFilters.has(filter)
        ? (filter as
            | "trending"
            | "recent"
            | "education"
            | "creator"
            | "ai"
            | "video"
            | "photo"
            | "music")
        : undefined;

    const result = await ctx.runQuery(api.gigaSocial.listDiscover, {
      filter: safeFilter,
      query,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return jsonResponse({ ok: true, ...result });
  });
});

export const gigaSocialDeveloperApiProfile = httpAction(async (ctx, request) => {
  return withDeveloperAuth(ctx, request, async () => {
    const url = new URL(request.url);
    const handle = url.searchParams.get("handle")?.trim();
    if (!handle) {
      return errorResponse(400, "missing_param", "Query parameter handle is required.");
    }

    const result = await ctx.runQuery(api.gigaSocial.getProfileByHandle, { handle });
    if (!result) {
      return errorResponse(404, "not_found", "Profile not found.");
    }
    return jsonResponse({ ok: true, ...result });
  });
});

export const gigaSocialDeveloperApiComments = httpAction(async (ctx, request) => {
  return withDeveloperAuth(ctx, request, async () => {
    const url = new URL(request.url);
    const postId = url.searchParams.get("postId")?.trim();
    if (!postId) {
      return errorResponse(400, "missing_param", "Query parameter postId is required.");
    }

    const result = await ctx.runQuery(api.gigaSocial.listComments, {
      postId: postId as Id<"socialPosts">,
    });
    return jsonResponse({ ok: true, ...result });
  });
});
