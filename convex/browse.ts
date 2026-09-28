"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireSession } from "./auth";
import { RateLimitError } from "./securityErrors";
import {
  BROWSE_BATCH_BUDGET_MS,
  BROWSE_MAX_BATCH,
  BROWSE_MAX_BYTES,
  BROWSE_MAX_TEXT_CHARS,
  BROWSE_TIMEOUT_MS,
  BrowseError,
  browseErrorMessage,
  classifyBrowseUrl,
  publicAuditUrl,
} from "./liveWeb/browsePolicy";
import { fetchPublicDocument } from "./liveWeb/safePublicFetch";
import { redactSensitivePatterns } from "./liveWeb/liveWebSecurity";

export type BrowsePageResult = {
  ok: true;
  source: "webpage";
  url: string;
  title: string;
  text: string;
  note: "Retrieved from the webpage. This text was not written by Giga3.";
};

export type BrowseFailure = {
  ok: false;
  source: "not_retrieved";
  error: string;
};

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleOf(html: string, fallback: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = match?.[1]?.replace(/\s+/g, " ").trim();
  return title || fallback;
}

export async function browseUrl(rawUrl: string, timeoutMs = BROWSE_TIMEOUT_MS): Promise<BrowsePageResult | BrowseFailure> {
  const classified = classifyBrowseUrl(rawUrl);
  if (!classified.ok) {
    return { ok: false, source: "not_retrieved", error: browseErrorMessage(classified.code) };
  }
  try {
    const page = await fetchPublicDocument(classified.url.toString(), {
      timeoutMs,
      maxBytes: BROWSE_MAX_BYTES,
    });
    const text = redactSensitivePatterns(htmlToText(page.body)).slice(0, BROWSE_MAX_TEXT_CHARS);
    if (!text) {
      return { ok: false, source: "not_retrieved", error: browseErrorMessage("unavailable") };
    }
    return {
      ok: true,
      source: "webpage",
      url: page.finalUrl,
      title: titleOf(page.body, classified.url.hostname),
      text,
      note: "Retrieved from the webpage. This text was not written by Giga3.",
    };
  } catch (err) {
    const code = err instanceof BrowseError ? err.code : "unavailable";
    return { ok: false, source: "not_retrieved", error: browseErrorMessage(code) };
  }
}

export async function browseMany(urls: string[]): Promise<{
  ok: boolean;
  error?: string;
  results: Array<BrowsePageResult | BrowseFailure>;
}> {
  if (urls.length > BROWSE_MAX_BATCH) {
    return { ok: false, error: browseErrorMessage("too_many_urls"), results: [] };
  }
  const started = Date.now();
  const results: Array<BrowsePageResult | BrowseFailure> = [];
  for (const url of urls) {
    const remaining = BROWSE_BATCH_BUDGET_MS - (Date.now() - started);
    if (remaining <= 0) {
      results.push({ ok: false, source: "not_retrieved", error: browseErrorMessage("timeout") });
      continue;
    }
    results.push(await browseUrl(url, Math.min(BROWSE_TIMEOUT_MS, remaining)));
  }
  return { ok: true, results };
}

export function browseAuditTarget(path: string): string | null {
  return publicAuditUrl(path);
}

async function authorizeBrowse(
  ctx: { runMutation: (ref: any, args: any) => Promise<any> },
  sessionToken: string
) {
  const email = await requireSession(sessionToken, ctx);
  await ctx.runMutation(internal.liveWebRateLimit.consumeLiveWebRateLimitInternal, {
    userId: email,
  });
}

export const browseUrlAction = action({
  args: { sessionToken: v.string(), url: v.string() },
  handler: async (ctx, args) => {
    try {
      await authorizeBrowse(ctx, args.sessionToken);
    } catch (err) {
      if (err instanceof RateLimitError) {
        return {
          ok: false as const,
          source: "not_retrieved" as const,
          error: "Browsing is temporarily limited. Please wait and try again.",
        };
      }
      return { ok: false as const, source: "not_retrieved" as const, error: "Sign in to browse the web." };
    }
    return browseUrl(args.url);
  },
});

export const browseManyAction = action({
  args: { sessionToken: v.string(), urls: v.array(v.string()) },
  handler: async (ctx, args) => {
    try {
      const email = await requireSession(args.sessionToken, ctx);
      await ctx.runMutation(internal.liveWebRateLimit.consumeLiveWebRateLimitInternal, {
        userId: email,
      });
    } catch (err) {
      if (err instanceof RateLimitError) {
        return { ok: false, error: "Browsing is temporarily limited. Please wait and try again.", results: [] };
      }
      return { ok: false, error: "Sign in to browse the web.", results: [] };
    }
    return browseMany(args.urls);
  },
});
