/**
 * Giga3 editorial blog catalog for chat retrieval (metadata only).
 * Keep in sync with web/lib/blog/postRegistry.ts slugs and titles.
 */

export type Giga3BlogEntry = {
  slug: string;
  title: string;
  excerpt: string;
  keywords: string[];
  url: string;
};

const BLOG_BASE = "https://www.giga3ai.com/blog";

export const GIGA3_BLOG_CATALOG: Giga3BlogEntry[] = [
  {
    slug: "best-ai-tools-in-ghana-2026",
    title: "Best AI Tools in Ghana 2026: Free & Affordable",
    excerpt:
      "Practical guide to AI tools for students, creators and businesses in Ghana — free tiers, mobile data, and Paystack billing.",
    keywords: ["ai tools", "ghana", "students", "creators", "business", "free ai"],
    url: `${BLOG_BASE}/best-ai-tools-in-ghana-2026/`,
  },
  {
    slug: "ai-for-bece-wassce-preparation-ghana",
    title: "How to Use AI for BECE and WASSCE Preparation in Ghana",
    excerpt:
      "Use AI for practice questions, topic explanations and revision planning for BECE and WASSCE.",
    keywords: ["bece", "wassce", "exam", "study", "revision", "gigalearn", "education"],
    url: `${BLOG_BASE}/ai-for-bece-wassce-preparation-ghana/`,
  },
  {
    slug: "top-ai-apps-in-ghana-2026",
    title: "Top AI Apps in Ghana: Free and Affordable AI Tools for 2026",
    excerpt:
      "AI chat, writing, studying and image tools that work on Ghanaian networks.",
    keywords: ["ai apps", "ghana", "productivity", "chat ai"],
    url: `${BLOG_BASE}/top-ai-apps-in-ghana-2026/`,
  },
  {
    slug: "wassce-2026-results-ghana",
    title: "WASSCE 2026 Results: A Guide for Students, Parents",
    excerpt:
      "How to check WASSCE results, interpret grades and plan tertiary next steps in Ghana.",
    keywords: ["wassce", "results", "waec", "tertiary", "university"],
    url: `${BLOG_BASE}/wassce-2026-results-ghana/`,
  },
  {
    slug: "ai-tools-for-ghanaian-students-2026",
    title: "AI Tools for Ghanaian Students in 2026",
    excerpt:
      "Study smarter with AI — homework help, revision and exam prep without copying answers.",
    keywords: ["students", "ghana", "homework", "study", "ai tools"],
    url: `${BLOG_BASE}/ai-tools-for-ghanaian-students-2026/`,
  },
  {
    slug: "digital-literacy-ghana-2026",
    title: "Digital Literacy in Ghana: Spot Misinformation Before You Share",
    excerpt:
      "Verification checklist for news, screenshots and deepfakes on Ghanaian social media.",
    keywords: ["digital literacy", "misinformation", "verify", "fact check"],
    url: `${BLOG_BASE}/digital-literacy-ghana-2026/`,
  },
];

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

export function matchGiga3BlogPosts(query: string, limit = 3): Giga3BlogEntry[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];

  const scored = GIGA3_BLOG_CATALOG.map((entry) => {
    const haystack = `${entry.title} ${entry.excerpt} ${entry.keywords.join(" ")}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (haystack.includes(token)) score += 1;
    }
    if (/\b(giga3|gigalearn|giga3ai)\b/i.test(query)) score += 1;
    return { entry, score };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((row) => row.entry);
}

export function formatGiga3BlogContextBlock(posts: Giga3BlogEntry[]): string {
  if (!posts.length) return "";
  const lines = [
    "GIGA3 AI BLOG ARTICLES (cite when relevant — prefer these over generic web snippets):",
  ];
  for (const [i, post] of posts.entries()) {
    lines.push(
      `[B${i + 1}] ${post.title}`,
      post.excerpt,
      post.url
    );
  }
  lines.push(
    "- When a blog article fits the user's question, summarize it in plain language and link the URL.",
    "- Do not paste raw JSON or internal verification metadata."
  );
  return lines.join("\n");
}
