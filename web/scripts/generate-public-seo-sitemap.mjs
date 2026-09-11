#!/usr/bin/env node
/**
 * Generates sitemap index + supplemental sitemaps at build time.
 *
 * sitemap.xml           — sitemap index (entry point for Google)
 * sitemap-static.xml    — marketing / product / legal pages
 * sitemap-blog.xml      — editorial blog (from postRegistry.ts)
 * sitemap-gigasocial.xml — public posts + profiles (Convex at build)
 * sitemap-marketplace.xml — published listings (Convex at build)
 * blog/rss.xml          — RSS feed for blog discovery
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const siteOrigin = "https://www.giga3ai.com";

/** Keep in sync with indexable marketing routes (no /chat/, /wallet/, etc.). */
const STATIC_SITEMAP_PATHS = [
  "/",
  "/pricing/",
  "/features/",
  "/about/",
  "/contact/",
  "/blog/",
  "/gigasocial/",
  "/marketplace/",
  "/install/",
  "/download/",
  "/automation/",
  "/legal/",
  "/legal/terms/",
  "/legal/privacy/",
  "/legal/cookies/",
  "/legal/refunds/",
  "/legal/acceptable-use/",
  "/legal/ai-usage/",
  "/legal/security/",
  "/ai-for-ghana/",
  "/ai-tools-for-students-ghana/",
  "/ai-for-teachers-ghana/",
  "/ai-for-schools-ghana/",
  "/ai-for-bece-wassce-ghana/",
  "/ai-for-business-ghana/",
  "/ai-for-creators-ghana/",
  "/african-ai-tools/",
  "/chat/",
  "/gigalearn/",
  "/prompts/",
  "/trending/",
  "/media/",
  "/video/",
  "/video/plans/",
  "/gigaedit/",
  "/gigaedits/",
  "/creator-studio/",
  "/ai-studio/",
  "/discover/",
  "/enterprise/",
  "/developers/",
];

function convexUrl() {
  return process.env.NEXT_PUBLIC_CONVEX_URL?.replace(/[\u200B-\u200D\uFEFF\u2060\u00AD]/g, "").trim();
}

async function convexQuery(queryPath, args = {}) {
  const url = convexUrl();
  if (!url) return null;
  const response = await fetch(`${url.replace(/\/$/, "")}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: queryPath, args, format: "json" }),
    cache: "force-cache",
  });
  if (!response.ok) return null;
  const payload = await response.json();
  if (payload.status === "error") return null;
  return payload.value;
}

const BUILD_LISTING_LIMIT = 200;
const BUILD_POST_LIMIT = 120;
const BUILD_PROFILE_LIMIT = 120;

async function loadSitemapEntries() {
  const [seoListings, seoPosts, seoProfiles] = await Promise.all([
    convexQuery("publicSeo:listMarketplaceSitemapEntries", { limit: BUILD_LISTING_LIMIT }),
    convexQuery("publicSeo:listPublicPostSitemapEntries", { limit: BUILD_POST_LIMIT }),
    convexQuery("publicSeo:listPublicProfileSitemapEntries", { limit: BUILD_PROFILE_LIMIT }),
  ]);

  if (seoListings || seoPosts || seoProfiles) {
    return {
      listings: seoListings ?? [],
      posts: seoPosts ?? [],
      profiles: seoProfiles ?? [],
    };
  }

  const [listings, feed] = await Promise.all([
    convexQuery("marketplace:searchListings", { limit: BUILD_LISTING_LIMIT }),
    convexQuery("gigaSocial:listFeed", { limit: BUILD_POST_LIMIT }),
  ]);

  const profiles = new Set();
  for (const post of feed?.posts ?? []) {
    if (post.author?.handle) profiles.add(post.author.handle.toLowerCase());
  }

  return {
    listings:
      listings?.map((row) => ({
        listingId: row._id,
        updatedAt: row.updatedAt ?? row.createdAt ?? Date.now(),
      })) ?? [],
    posts:
      feed?.posts?.map((post) => ({
        postId: post._id,
        updatedAt: post.createdAt ?? Date.now(),
      })) ?? [],
    profiles: [...profiles].map((handle) => ({
      handle,
      updatedAt: Date.now(),
    })),
  };
}

function xmlEscape(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function writeUrlset(filename, urls) {
  if (!urls.length) {
    console.log(`generate-public-seo-sitemap: skip empty ${filename}`);
    return false;
  }
  const body = urls
    .map(
      (entry) =>
        `  <url><loc>${xmlEscape(entry.loc)}</loc><lastmod>${entry.lastmod}</lastmod><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  writeFileSync(path.join(publicDir, filename), xml, "utf8");
  console.log(`generate-public-seo-sitemap: wrote ${filename} (${urls.length} urls)`);
  return true;
}

function writeSitemapIndex(filename, sitemaps) {
  if (!sitemaps.length) return false;
  const body = sitemaps
    .map(
      (entry) =>
        `  <sitemap><loc>${xmlEscape(entry.loc)}</loc><lastmod>${entry.lastmod}</lastmod></sitemap>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
  writeFileSync(path.join(publicDir, filename), xml, "utf8");
  console.log(`generate-public-seo-sitemap: wrote ${filename} (${sitemaps.length} child sitemaps)`);
  return true;
}

function ensureRobotsSitemap(filename) {
  const robotsPath = path.join(publicDir, "robots.txt");
  if (!existsSync(robotsPath)) return;
  const loc = `${siteOrigin}/${filename}`;
  let robots = readFileSync(robotsPath, "utf8");
  if (robots.includes(loc)) return;
  robots = `${robots.trim()}\nSitemap: ${loc}\n`;
  writeFileSync(robotsPath, robots, "utf8");
  console.log(`generate-public-seo-sitemap: added robots.txt entry for ${filename}`);
}

function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function loadBlogSitemapEntries() {
  const registryPath = path.resolve(__dirname, "../lib/blog/postRegistry.ts");
  if (!existsSync(registryPath)) return [];
  const src = readFileSync(registryPath, "utf8");
  const blocks = src.split(/slug:\s*"/).slice(1);
  const entries = [];
  for (const block of blocks) {
    const slug = block.match(/^([^"]+)"/)?.[1];
    if (!slug) continue;
    const title = block.match(/title:\s*\n?\s*"([^"]+)"/)?.[1] ?? slug;
    const description = block.match(/description:\s*\n?\s*"([^"]+)"/)?.[1] ?? "";
    const publishedAt = block.match(/publishedAt:\s*"([^"]+)"/)?.[1];
    const updatedAt = block.match(/updatedAt:\s*"([^"]+)"/)?.[1];
    entries.push({
      slug,
      title,
      description,
      lastmod: updatedAt ?? publishedAt ?? "2026-09-04",
    });
  }
  return entries;
}

function writeStaticSitemap() {
  const lastmod = todayIso();
  const uniquePaths = [...new Set(STATIC_SITEMAP_PATHS)];
  const urls = uniquePaths.map((route) => ({
    loc: `${siteOrigin}${route}`,
    lastmod,
    changefreq: "weekly",
    priority: route === "/" ? "1.0" : "0.8",
  }));
  return writeUrlset("sitemap-static.xml", urls) ? "sitemap-static.xml" : null;
}

function writeBlogSitemap() {
  const posts = loadBlogSitemapEntries();
  const blogLastmod = posts.reduce((max, p) => (p.lastmod > max ? p.lastmod : max), todayIso());
  const urls = [
    {
      loc: `${siteOrigin}/blog/`,
      lastmod: blogLastmod,
      changefreq: "weekly",
      priority: "0.9",
    },
    ...posts.map((post) => ({
      loc: `${siteOrigin}/blog/${post.slug}/`,
      lastmod: post.lastmod,
      changefreq: "monthly",
      priority: "0.8",
    })),
    ...[
      "ai-in-ghana",
      "education",
      "bece-wassce",
      "ai-tools",
      "creators",
      "business",
      "technology",
      "digital-literacy",
      "ghana",
    ].map((slug) => ({
      loc: `${siteOrigin}/blog/category/${slug}/`,
      lastmod: blogLastmod,
      changefreq: "monthly",
      priority: "0.7",
    })),
  ];

  if (!writeUrlset("sitemap-blog.xml", urls)) return null;
  ensureRobotsSitemap("sitemap-blog.xml");
  return "sitemap-blog.xml";
}

function writeBlogRss() {
  const posts = loadBlogSitemapEntries();
  if (!posts.length) return null;

  const items = posts
    .map((post) => {
      const link = `${siteOrigin}/blog/${post.slug}/`;
      return `    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="true">${xmlEscape(link)}</guid>
      <pubDate>${new Date(`${post.lastmod}T12:00:00Z`).toUTCString()}</pubDate>
      <description>${xmlEscape(post.description.slice(0, 500))}</description>
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Giga3 AI Blog</title>
    <link>${siteOrigin}/blog/</link>
    <description>AI, education and technology guides for Ghana and Africa from Giga3 AI.</description>
    <language>en-gh</language>
    <atom:link href="${siteOrigin}/blog/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
  mkdirSync(path.join(publicDir, "blog"), { recursive: true });
  writeFileSync(path.join(publicDir, "blog/rss.xml"), rss, "utf8");
  console.log(`generate-public-seo-sitemap: wrote blog/rss.xml (${posts.length} items)`);
  return "blog/rss.xml";
}

async function main() {
  const childSitemaps = [];
  const lastmod = todayIso();

  const staticFile = writeStaticSitemap();
  if (staticFile) childSitemaps.push({ loc: `${siteOrigin}/${staticFile}`, lastmod });

  const blogFile = writeBlogSitemap();
  if (blogFile) childSitemaps.push({ loc: `${siteOrigin}/${blogFile}`, lastmod });

  writeBlogRss();

  if (!convexUrl()) {
    console.warn("generate-public-seo-sitemap: NEXT_PUBLIC_CONVEX_URL unset — skipping dynamic sitemaps");
  } else {
    try {
      const { listings, posts, profiles } = await loadSitemapEntries();

      if (
        writeUrlset(
          "sitemap-marketplace.xml",
          listings.map((entry) => ({
            loc: `${siteOrigin}/marketplace/item/${entry.listingId}/`,
            lastmod: isoDate(entry.updatedAt),
            changefreq: "weekly",
            priority: "0.6",
          }))
        )
      ) {
        ensureRobotsSitemap("sitemap-marketplace.xml");
        childSitemaps.push({ loc: `${siteOrigin}/sitemap-marketplace.xml`, lastmod });
      }

      if (
        writeUrlset(
          "sitemap-gigasocial.xml",
          [
            {
              loc: `${siteOrigin}/gigasocial/`,
              lastmod,
              changefreq: "daily",
              priority: "0.8",
            },
            ...posts.map((entry) => ({
              loc: `${siteOrigin}/gigasocial/post/${entry.postId}/`,
              lastmod: isoDate(entry.updatedAt),
              changefreq: "weekly",
              priority: "0.6",
            })),
            ...profiles.map((entry) => ({
              loc: `${siteOrigin}/gigasocial/profile/${encodeURIComponent(entry.handle)}/`,
              lastmod: isoDate(entry.updatedAt),
              changefreq: "weekly",
              priority: "0.6",
            })),
          ]
        )
      ) {
        ensureRobotsSitemap("sitemap-gigasocial.xml");
        childSitemaps.push({ loc: `${siteOrigin}/sitemap-gigasocial.xml`, lastmod });
      }
    } catch (err) {
      console.warn(
        "generate-public-seo-sitemap: Convex fetch failed — skipping dynamic sitemaps:",
        err instanceof Error ? err.message : err
      );
    }
  }

  writeSitemapIndex("sitemap.xml", childSitemaps);
  ensureRobotsSitemap("sitemap.xml");
}

main().catch((err) => {
  console.warn("generate-public-seo-sitemap: non-fatal error", err);
});
