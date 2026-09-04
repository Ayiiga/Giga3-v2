#!/usr/bin/env node
/**
 * Fetches public marketplace and GigaSocial entries from Convex at build time
 * and writes supplemental sitemap XML files under public/.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const siteOrigin = "https://www.giga3ai.com";

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
  });
  if (!response.ok) return null;
  const payload = await response.json();
  if (payload.status === "error") return null;
  return payload.value;
}

// Keep in sync with web/lib/seo/convexBuildFetch.ts BUILD_* limits (SSG page count).
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

/** Parse slug and dates from web/lib/blog/postRegistry.ts without a TS compiler. */
function loadBlogSitemapEntries() {
  const registryPath = path.resolve(__dirname, "../lib/blog/postRegistry.ts");
  if (!existsSync(registryPath)) return [];
  const src = readFileSync(registryPath, "utf8");
  const blocks = src.split(/slug:\s*"/).slice(1);
  const entries = [];
  for (const block of blocks) {
    const slug = block.match(/^([^"]+)"/)?.[1];
    if (!slug) continue;
    const publishedAt = block.match(/publishedAt:\s*"([^"]+)"/)?.[1];
    const updatedAt = block.match(/updatedAt:\s*"([^"]+)"/)?.[1];
    entries.push({
      slug,
      lastmod: updatedAt ?? publishedAt ?? "2026-09-04",
    });
  }
  return entries;
}

function writeBlogSitemap() {
  const posts = loadBlogSitemapEntries();
  const urls = [
    {
      loc: `${siteOrigin}/blog/`,
      lastmod: posts.reduce((max, p) => (p.lastmod > max ? p.lastmod : max), "2026-09-04"),
      changefreq: "weekly",
      priority: "0.8",
    },
    ...posts.map((post) => ({
      loc: `${siteOrigin}/blog/${post.slug}/`,
      lastmod: post.lastmod,
      changefreq: "monthly",
      priority: "0.7",
    })),
    ...[
      "ai-in-ghana",
      "education",
      "bece-wassce",
      "ai-tools",
      "creators",
      "business",
      "technology",
    ].map((slug) => ({
      loc: `${siteOrigin}/blog/category/${slug}/`,
      lastmod: "2026-09-04",
      changefreq: "monthly",
      priority: "0.6",
    })),
  ];

  if (writeUrlset("sitemap-blog.xml", urls)) {
    ensureRobotsSitemap("sitemap-blog.xml");
  }
}

async function main() {
  writeBlogSitemap();

  if (!convexUrl()) {
    console.warn("generate-public-seo-sitemap: NEXT_PUBLIC_CONVEX_URL unset — skipping dynamic sitemaps");
    return;
  }

  let listings = [];
  let posts = [];
  let profiles = [];

  try {
    ({ listings, posts, profiles } = await loadSitemapEntries());
  } catch (err) {
    console.warn(
      "generate-public-seo-sitemap: Convex fetch failed — skipping dynamic sitemaps:",
      err instanceof Error ? err.message : err
    );
    return;
  }

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
  }

  if (
    writeUrlset(
      "sitemap-gigasocial.xml",
      [
        ...posts.map((entry) => ({
          loc: `${siteOrigin}/gigasocial/post/${entry.postId}/`,
          lastmod: isoDate(entry.updatedAt),
          changefreq: "weekly",
          priority: "0.5",
        })),
        ...profiles.map((entry) => ({
          loc: `${siteOrigin}/gigasocial/profile/${encodeURIComponent(entry.handle)}/`,
          lastmod: isoDate(entry.updatedAt),
          changefreq: "weekly",
          priority: "0.5",
        })),
      ]
    )
  ) {
    ensureRobotsSitemap("sitemap-gigasocial.xml");
  }
}

main().catch((err) => {
  console.warn("generate-public-seo-sitemap: non-fatal error", err);
});
