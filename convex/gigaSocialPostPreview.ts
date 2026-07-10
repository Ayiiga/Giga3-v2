import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { PublicSocialPost } from "./gigaSocialViews";
import {
  buildGigaSocialOgMeta,
  renderGigaSocialPreviewHtml,
  renderGigaSocialUnavailableHtml,
} from "./gigaSocialOg";

export const gigaSocialPostPreview = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const postId = url.searchParams.get("id")?.trim();
  if (!postId) {
    return new Response("Missing id query parameter", { status: 400 });
  }

  let post: PublicSocialPost | null = null;
  try {
    post = await ctx.runQuery(api.gigaSocial.getPublicPost, {
      postId: postId as Id<"socialPosts">,
    });
  } catch {
    post = null;
  }

  if (!post) {
    const html = renderGigaSocialUnavailableHtml(postId);
    return new Response(html, {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=120",
      },
    });
  }

  const meta = buildGigaSocialOgMeta(post);
  const html = renderGigaSocialPreviewHtml(meta, post.author);
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});
