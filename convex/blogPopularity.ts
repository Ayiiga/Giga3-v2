import { BLOG_POST_REGISTRY } from "../web/lib/blog/postRegistry";

const BLOG_URL = "https://www.giga3ai.com/blog/";
export const publishedBlogSlugs = BLOG_POST_REGISTRY.map((post) => post.slug);

export function blogPopularityLimit(query: string): number | null {
  if (!/\bgiga\s*3(?:\s*ai)?\b/i.test(query) || !/\bblogs?\b/i.test(query)) return null;
  if (!/\b(?:popular|most[\s-]+(?:viewed|read)|highest[\s-]+views|top[\s-]+(?:\d+|(?:blog|article|post)s?))\b/i.test(query)) return null;
  // The counters are cumulative. Leave requests for another metric or time range to normal routing.
  if (/\b(?:ratings?|rated|trending|likes?|shares?|google (?:search|clicks)|search (?:traffic|clicks)|today|yesterday|this (?:week|month|year)|(?:last|past) (?:\d+\s+)?(?:days?|weeks?|months?|years?))\b/i.test(query)) return null;
  const count = query.match(/\b(?:top|show(?: me)?|list)\s+(\d+)\b/i)?.[1];
  if (count) return Math.min(10, Math.max(1, Number(count)));
  return /\b(?:articles|posts|blogs)\b/i.test(query) && !/\b(?:article|post)\b/i.test(query) ? 3 : 1;
}

export function formatBlogPopularity(counts: Record<string, number> | null, limit: number): string {
  const ranked = counts ? BLOG_POST_REGISTRY.map((post) => ({
    ...post,
    views: counts[post.slug] ?? 0,
  })).filter((post) => Number.isFinite(post.views) && post.views > 0)
    .sort((a, b) => b.views - a.views || a.title.localeCompare(b.title)) : [];

  if (!ranked.length) {
    return `I couldn’t verify a popularity ranking from Giga3 AI’s recorded blog views. [Browse the Giga3 AI blog](${BLOG_URL}).`;
  }

  if (limit === 1) {
    const leaders = ranked.filter((post) => post.views === ranked[0].views);
    if (leaders.length === 1) {
      const [post] = leaders;
      return `The most-viewed article on the Giga3 AI blog is **${post.title}**, with **${post.views.toLocaleString("en-US")} recorded views**.\n\n${post.excerpt}\n\n[Read the article](${BLOG_URL}${post.slug}/).`;
    }
    return `These Giga3 AI articles are tied for the most recorded views:\n\n${leaders.map((post) =>
      `- [${post.title}](${BLOG_URL}${post.slug}/) — ${post.views.toLocaleString("en-US")} views`
    ).join("\n")}`;
  }
  return `Here are the most-viewed articles on the Giga3 AI blog by recorded views:\n\n${ranked.slice(0, limit).map((post, index) =>
    `${index + 1}. [${post.title}](${BLOG_URL}${post.slug}/) — ${post.views.toLocaleString("en-US")} views`
  ).join("\n")}`;
}
