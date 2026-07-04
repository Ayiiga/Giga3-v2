"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { requireSessionWithMonitoring } from "./auth";
import { geminiGenerateWithGrounding } from "./webSearch";

export type NewsFeedItem = {
  title: string;
  link: string;
  publishedAt: string | null;
  source: string;
  platform: string;
};

const FEEDS: Array<{ url: string; source: string; platform: string }> = [
  {
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    source: "BBC News",
    platform: "News",
  },
  {
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    source: "Al Jazeera",
    platform: "News",
  },
  {
    url: "https://news.google.com/rss?hl=en-GH&gl=GH&ceid=GH:en",
    source: "Google News",
    platform: "News",
  },
  {
    url: "https://www.reddit.com/r/worldnews/.rss",
    source: "Reddit r/worldnews",
    platform: "Social",
  },
  {
    url: "https://www.reddit.com/r/news/.rss",
    source: "Reddit r/news",
    platform: "Social",
  },
];

function decodeEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function parseFeedItems(
  xml: string,
  source: string,
  platform: string,
  limit = 4
): NewsFeedItem[] {
  const items: NewsFeedItem[] = [];
  const blocks = xml.match(/<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi) ?? [];

  for (const block of blocks) {
    if (items.length >= limit) break;
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch =
      block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ??
      block.match(/<link[^>]+href=["']([^"']+)["']/i);
    const dateMatch =
      block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) ??
      block.match(/<updated>([\s\S]*?)<\/updated>/i);

    const title = titleMatch ? decodeEntities(titleMatch[1]) : "";
    const link = linkMatch ? decodeEntities(linkMatch[1]).trim() : "";
    if (!title || !link) continue;

    items.push({
      title: title.slice(0, 300),
      link,
      publishedAt: dateMatch ? decodeEntities(dateMatch[1]) : null,
      source,
      platform,
    });
  }

  return items;
}

async function fetchFeed(
  feed: (typeof FEEDS)[number],
  limit: number
): Promise<NewsFeedItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Giga3CreatorNews/1.0 (+https://www.giga3ai.com)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeedItems(xml, feed.source, feed.platform, limit);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export type NewsVerificationVerdict = "authentic" | "unverified" | "misinformation";

export type NewsVerificationResult = {
  verdict: NewsVerificationVerdict;
  confidence: "high" | "medium" | "low";
  summary: string;
  reasons: string[];
  trustedSources: Array<{ title: string; uri: string }>;
  checkedAt: number;
};

function parseVerificationJson(text: string): Omit<NewsVerificationResult, "trustedSources" | "checkedAt"> {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      verdict: "unverified",
      confidence: "low",
      summary: text.slice(0, 500),
      reasons: ["Could not parse a structured verdict."],
    };
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      verdict?: string;
      confidence?: string;
      summary?: string;
      reasons?: string[];
    };
    const verdict =
      parsed.verdict === "authentic" ||
      parsed.verdict === "misinformation" ||
      parsed.verdict === "unverified"
        ? parsed.verdict
        : "unverified";
    const confidence =
      parsed.confidence === "high" ||
      parsed.confidence === "medium" ||
      parsed.confidence === "low"
        ? parsed.confidence
        : "medium";
    return {
      verdict,
      confidence,
      summary: (parsed.summary ?? text).slice(0, 800),
      reasons: Array.isArray(parsed.reasons)
        ? parsed.reasons.map((r) => String(r).slice(0, 300)).slice(0, 5)
        : [],
    };
  } catch {
    return {
      verdict: "unverified",
      confidence: "low",
      summary: text.slice(0, 500),
      reasons: ["Verification response was not valid JSON."],
    };
  }
}

/** Latest headlines from news sites and social discussion feeds. */
export const fetchLatestNews = action({
  args: {
    sessionToken: v.string(),
    limitPerFeed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSessionWithMonitoring(args.sessionToken, ctx, "creatorNews.fetch");
    const perFeed = Math.min(Math.max(args.limitPerFeed ?? 3, 1), 5);

    const batches = await Promise.all(FEEDS.map((feed) => fetchFeed(feed, perFeed)));
    const merged = batches.flat();

    const seen = new Set<string>();
    const headlines: NewsFeedItem[] = [];
    for (const item of merged) {
      const key = item.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      headlines.push(item);
    }

    headlines.sort((a, b) => {
      const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return tb - ta;
    });

    return {
      fetchedAt: Date.now(),
      headlines: headlines.slice(0, 24),
      feedCount: FEEDS.length,
    };
  },
});

/** Fact-check a headline or social post using web-grounded Gemini. */
export const verifyNewsClaim = action({
  args: {
    sessionToken: v.string(),
    claim: v.string(),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSessionWithMonitoring(args.sessionToken, ctx, "creatorNews.verify");
    const claim = args.claim.trim().slice(0, 2000);
    if (claim.length < 8) {
      throw new Error("Enter a headline or claim with at least 8 characters.");
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("News verification is temporarily unavailable.");
    }

    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
    const sourceLine = args.sourceUrl?.trim()
      ? `\nOriginal link: ${args.sourceUrl.trim().slice(0, 500)}`
      : "";

    const grounded = await geminiGenerateWithGrounding({
      apiKey,
      model,
      enableWebSearch: true,
      timeoutMs: 45000,
      maxTokens: 1024,
      messages: [
        {
          role: "system",
          content: `You are a fact-checking assistant for Giga3 marketplace creators in Ghana and worldwide.
Use current web sources. Compare the claim against reputable news outlets and official sources.
Respond with JSON only (no markdown fences):
{
  "verdict": "authentic" | "unverified" | "misinformation",
  "confidence": "high" | "medium" | "low",
  "summary": "2-4 sentences for creators",
  "reasons": ["bullet reason 1", "bullet reason 2"]
}
Rules:
- "authentic" = well-supported by multiple credible sources
- "misinformation" = contradicted by credible sources or clearly false
- "unverified" = insufficient evidence or single unconfirmed report
- Never invent sources; rely on search grounding results`,
        },
        {
          role: "user",
          content: `Fact-check this claim for a creator selling digital products:\n"${claim}"${sourceLine}`,
        },
      ],
    });

    const parsed = parseVerificationJson(grounded.text);
    const result: NewsVerificationResult = {
      ...parsed,
      trustedSources: grounded.sources.slice(0, 6),
      checkedAt: Date.now(),
    };
    return result;
  },
});
