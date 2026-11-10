const SITE = "https://www.giga3ai.com";
const BASE = "/blog/editorial/";
const ARTICLE_PATH = /^\/blog\/editorial\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]
  );
}

function inlineMarkdown(text) {
  let html = "";
  let end = 0;
  for (const match of text.matchAll(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/gi)) {
    html += escapeHtml(text.slice(end, match.index));
    html += `<a href="${escapeHtml(match[2])}">${escapeHtml(match[1])}</a>`;
    end = match.index + match[0].length;
  }
  return html + escapeHtml(text.slice(end));
}

function markdownHtml(markdown) {
  return markdown.replace(/\r\n?/g, "\n").split(/\n\s*\n/).map((block) => {
    const lines = block.trim().split("\n");
    if (lines.every((line) => /^[-*] /.test(line))) {
      return `<ul>${lines.map((line) => `<li>${inlineMarkdown(line.slice(2))}</li>`).join("")}</ul>`;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(lines[0]);
    if (!heading) return `<p>${inlineMarkdown(lines.join(" "))}</p>`;
    const level = Math.max(2, heading[1].length);
    const rest = lines.slice(1).join(" ");
    return `<h${level}>${inlineMarkdown(heading[2])}</h${level}>${rest ? `<p>${inlineMarkdown(rest)}</p>` : ""}`;
  }).join("\n");
}

function page(title, description, path, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} | Giga3 AI</title><meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(SITE + path)}">
<style>body{font:1.1rem/1.65 system-ui,sans-serif;margin:0;color:#211732;background:#fff}main,nav{max-width:44rem;margin:auto;padding:1rem}a{color:#5b21b6}h1,h2,h3{line-height:1.2}li{margin:.4rem 0}</style>
</head><body><nav aria-label="Blog"><a href="/blog/">Giga3 AI Blog</a> · <a href="${BASE}">Editorial articles</a></nav>
<main><h1>${escapeHtml(title)}</h1>${body}</main></body></html>`;
}

async function queryEditorial(context, functionName, args) {
  const base = (context.env?.CONVEX_URL || "https://perfect-lark-521.convex.cloud").replace(/\/$/, "");
  const response = await fetch(`${base}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: `gigaSeo:${functionName}`, args, format: "json" }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Editorial source unavailable");
  const result = await response.json();
  if (result.status !== "success") throw new Error("Editorial query failed");
  return result.value;
}

export async function editorialBlogResponse(context, pathname) {
  const article = ARTICLE_PATH.exec(pathname);
  const isIndex = pathname === BASE || pathname === BASE.slice(0, -1);
  if ((!article && !isIndex) || !["GET", "HEAD"].includes(context.request.method)) return null;
  if (!pathname.endsWith("/")) return Response.redirect(SITE + pathname + "/", 301);
  try {
    let html;
    if (article) {
      const post = await queryEditorial(context, "getPublishedArticle", { slug: article[1] });
      if (!post?.markdown) return null;
      html = page(post.title, post.description, pathname, markdownHtml(post.markdown));
    } else {
      const posts = await queryEditorial(context, "listPublishedArticles", {});
      const entries = posts.map((post) =>
        `<li><a href="${escapeHtml(post.url)}">${escapeHtml(post.title)}</a><p>${escapeHtml(post.description)}</p></li>`
      ).join("");
      html = page("Editorial articles", "New articles from the Giga3 AI editorial team.", BASE,
        entries ? `<ul>${entries}</ul>` : "<p>New editorial articles will appear here as they are published.</p>");
    }
    return new Response(context.request.method === "HEAD" ? null : html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(context.request.method === "HEAD" ? null : "Editorial articles are temporarily unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "60", "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
