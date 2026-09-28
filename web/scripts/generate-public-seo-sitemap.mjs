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
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANONICAL_ORIGIN,
  canonicalLoc,
  changedPublicUrls,
  robotsTxt,
  sitemapUrlLimit,
} from "./seo-route-policy.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(__dirname, "../..");
const siteOrigin = CANONICAL_ORIGIN;

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
  "/ghana-ai/",
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

function urlEntryXml(entry) {
  const lastmod = entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : "";
  return `  <url><loc>${xmlEscape(entry.loc)}</loc>${lastmod}<changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`;
}

function writeUrlset(filename, urls) {
  // Query-param and private URLs must never be submitted. Canonical tags
  // point at the clean public route.
  const seen = new Set();
  const clean = [];
  for (const entry of urls) {
    const loc = canonicalLoc(entry.loc);
    if (!loc) {
      console.log(`generate-public-seo-sitemap: dropped non-public url ${entry.loc}`);
      continue;
    }
    if (seen.has(loc)) continue;
    seen.add(loc);
    clean.push({ ...entry, loc });
  }
  if (clean.length > sitemapUrlLimit()) {
    throw new Error(`${filename} exceeds the sitemap protocol limit of ${sitemapUrlLimit()} urls`);
  }
  if (!clean.length) {
    console.log(`generate-public-seo-sitemap: skip empty ${filename}`);
    return null;
  }
  const body = clean.map((entry) => urlEntryXml(entry)).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  writeFileSync(path.join(publicDir, filename), xml, "utf8");
  console.log(`generate-public-seo-sitemap: wrote ${filename} (${clean.length} urls)`);
  return { count: clean.length, lastmod: maxLastmod(clean) };
}

/**
 * Keep referencing a previously generated child sitemap when fresh Convex
 * data is unavailable — dropping it from the index orphans up to hundreds
 * of already-indexed post/profile/listing URLs from Google.
 */
function retainExistingChild(childSitemaps, filename) {
  const filePath = path.join(publicDir, filename);
  if (!existsSync(filePath)) return;
  const loc = `${siteOrigin}/${filename}`;
  if (childSitemaps.some((entry) => entry.loc === loc)) return;
  const xml = readFileSync(filePath, "utf8");
  const dates = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
  childSitemaps.push({ loc, lastmod: dates.sort().at(-1) ?? null });
  console.log(`generate-public-seo-sitemap: retained existing ${filename} in index`);
}

function writeSitemapIndex(filename, sitemaps) {
  if (!sitemaps.length) return false;
  const body = sitemaps
    .map((entry) => {
      const lastmod = entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : "";
      return `  <sitemap><loc>${xmlEscape(entry.loc)}</loc>${lastmod}</sitemap>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
  writeFileSync(path.join(publicDir, filename), xml, "utf8");
  console.log(`generate-public-seo-sitemap: wrote ${filename} (${sitemaps.length} child sitemaps)`);
  return true;
}

function ensureRobotsSitemapIndex() {
  writeFileSync(path.join(publicDir, "robots.txt"), robotsTxt(), "utf8");
}

function maxLastmod(entries) {
  let max = "";
  for (const entry of entries) {
    if (entry.lastmod && entry.lastmod > max) max = entry.lastmod;
  }
  return max || null;
}

let gitHistoryDeep = null;
function historyIsDeep() {
  if (gitHistoryDeep !== null) return gitHistoryDeep;
  try {
    const count = Number(
      execFileSync("git", ["rev-list", "--count", "HEAD"], {
        cwd: repoRoot,
        encoding: "utf8",
      }).trim()
    );
    gitHistoryDeep = count >= 30;
  } catch {
    gitHistoryDeep = false;
  }
  return gitHistoryDeep;
}

function gitLastmod(file) {
  if (!historyIsDeep()) return null;
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null;
  }
}

function pageSource(route) {
  const rel = route === "/" ? "" : route.replace(/^\//, "").replace(/\/$/, "");
  const candidates = [
    path.join(webRoot, "app/(marketing)", rel, "page.tsx"),
    path.join(webRoot, "app/(app)", rel, "page.tsx"),
    path.join(webRoot, "app/(marketing)", rel, "layout.tsx"),
  ];
  return candidates.find((file) => existsSync(file)) ?? null;
}

function readExistingLastmods() {
  const map = new Map();
  for (const filename of ["sitemap-static.xml", "sitemap-blog.xml", "sitemap-marketplace.xml", "sitemap-gigasocial.xml"]) {
    const filePath = path.join(publicDir, filename);
    if (!existsSync(filePath)) continue;
    const xml = readFileSync(filePath, "utf8");
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>(?:<lastmod>([^<]*)<\/lastmod>)?/g)) {
      map.set(match[1], match[2] || "");
    }
  }
  return map;
}

const previousLastmods = readExistingLastmods();

function truthfulLastmod(route, loc) {
  const source = pageSource(route);
  const fromGit = source ? gitLastmod(source) : null;
  if (fromGit) return fromGit;
  return previousLastmods.get(loc) || null;
}

function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function loadBlogCategorySlugsWithPosts() {
  const categoryNames = new Set();
  const registryPath = path.resolve(__dirname, "../lib/blog/postRegistry.ts");
  if (!existsSync(registryPath)) return [];
  const src = readFileSync(registryPath, "utf8");
  const blocks = src.split(/slug:\s*"/).slice(1);
  for (const block of blocks) {
    const category = block.match(/category:\s*"([^"]+)"/)?.[1];
    if (category) categoryNames.add(category);
  }
  const slugByCategory = {
    "AI in Ghana": "ai-in-ghana",
    Education: "education",
    "BECE & WASSCE": "bece-wassce",
    "AI Tools": "ai-tools",
    Creators: "creators",
    Business: "business",
    Technology: "technology",
    "Digital Literacy": "digital-literacy",
    Ghana: "ghana",
  };
  return [...categoryNames]
    .map((name) => slugByCategory[name])
    .filter(Boolean);
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
      lastmod: updatedAt ?? publishedAt ?? null,
    });
  }
  return entries;
}

function writeStaticSitemap() {
  const uniquePaths = [...new Set(STATIC_SITEMAP_PATHS)];
  const urls = uniquePaths.map((route) => {
    const loc = `${siteOrigin}${route === "/" ? "/" : route}`;
    return {
      loc,
      lastmod: truthfulLastmod(route, loc),
      changefreq: "weekly",
      priority: route === "/" ? "1.0" : "0.8",
    };
  });
  return writeUrlset("sitemap-static.xml", urls);
}

function writeBlogSitemap() {
  const posts = loadBlogSitemapEntries();
  const blogLastmod = maxLastmod(posts);
  const urls = [
    ...posts.map((post) => ({
      loc: `${siteOrigin}/blog/${post.slug}/`,
      lastmod: post.lastmod,
      changefreq: "monthly",
      priority: "0.8",
    })),
    ...loadBlogCategorySlugsWithPosts().map((slug) => ({
      loc: `${siteOrigin}/blog/category/${slug}/`,
      lastmod: blogLastmod,
      changefreq: "monthly",
      priority: "0.7",
    })),
  ];

  return writeUrlset("sitemap-blog.xml", urls);
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
      <pubDate>${post.lastmod ? new Date(`${post.lastmod}T12:00:00Z`).toUTCString() : ""}</pubDate>
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

function pushChild(childSitemaps, filename, lastmod) {
  if (!lastmod && lastmod !== null) return;
  if (!existsSync(path.join(publicDir, filename))) return;
  childSitemaps.push({ loc: `${siteOrigin}/${filename}`, lastmod });
}

function collectPageLocs() {
  const map = new Map();
  for (const filename of ["sitemap-static.xml", "sitemap-blog.xml", "sitemap-marketplace.xml", "sitemap-gigasocial.xml"]) {
    const filePath = path.join(publicDir, filename);
    if (!existsSync(filePath)) continue;
    const xml = readFileSync(filePath, "utf8");
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>(?:<lastmod>([^<]*)<\/lastmod>)?/g)) {
      map.set(match[1], match[2] || "");
    }
  }
  return map;
}

async function main() {
  const before = new Map(previousLastmods);
  const childSitemaps = [];

  const staticSitemap = writeStaticSitemap();
  if (staticSitemap?.count) pushChild(childSitemaps, "sitemap-static.xml", staticSitemap.lastmod);

  const blogSitemap = writeBlogSitemap();
  if (blogSitemap?.count) pushChild(childSitemaps, "sitemap-blog.xml", blogSitemap.lastmod);

  writeBlogRss();

  if (!convexUrl()) {
    console.warn("generate-public-seo-sitemap: NEXT_PUBLIC_CONVEX_URL unset — retaining existing dynamic sitemaps");
    retainExistingChild(childSitemaps, "sitemap-marketplace.xml");
    retainExistingChild(childSitemaps, "sitemap-gigasocial.xml");
  } else {
    try {
      const { listings, posts, profiles } = await loadSitemapEntries();
      const marketplaceSitemap = writeUrlset(
        "sitemap-marketplace.xml",
        listings.map((entry) => ({
          loc: `${siteOrigin}/marketplace/item/${entry.listingId}/`,
          lastmod: isoDate(entry.updatedAt),
          changefreq: "weekly",
          priority: "0.6",
        }))
      );
      if (marketplaceSitemap?.count) pushChild(childSitemaps, "sitemap-marketplace.xml", marketplaceSitemap.lastmod);
      else retainExistingChild(childSitemaps, "sitemap-marketplace.xml");

      const socialSitemap = writeUrlset("sitemap-gigasocial.xml", [
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
      ]);
      if (socialSitemap?.count) pushChild(childSitemaps, "sitemap-gigasocial.xml", socialSitemap.lastmod);
      else retainExistingChild(childSitemaps, "sitemap-gigasocial.xml");
    } catch (err) {
      console.warn(
        "generate-public-seo-sitemap: Convex fetch failed — retaining existing dynamic sitemaps:",
        err instanceof Error ? err.message : err
      );
      retainExistingChild(childSitemaps, "sitemap-marketplace.xml");
      retainExistingChild(childSitemaps, "sitemap-gigasocial.xml");
    }
  }

  writeSitemapIndex("sitemap.xml", childSitemaps);
  ensureRobotsSitemapIndex();

  const changed = changedPublicUrls(before, collectPageLocs());
  writeFileSync(
    path.resolve(__dirname, "../.indexnow-pending.json"),
    JSON.stringify({ urls: changed }, null, 2),
    "utf8"
  );
  console.log(`generate-public-seo-sitemap: ${changed.length} public urls changed for IndexNow`);
}

main().catch((err) => {
  console.warn("generate-public-seo-sitemap: non-fatal error", err);
});
