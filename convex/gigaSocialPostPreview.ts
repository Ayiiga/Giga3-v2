import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { PublicSocialPost } from "./gigaSocialViews";
import {
  buildGigaSocialOgMeta,
  renderGigaSocialPreviewHtml,
  renderGigaSocialUnavailableHtml,
} from "./gigaSocialOg";

type PublicPostOgBundle = {
  post: PublicSocialPost;
  mediaMetaJson?: string;
};

export const gigaSocialPostPreview = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const postId = url.searchParams.get("id")?.trim();
  if (!postId) {
    return new Response("Missing id query parameter", { status: 400 });
  }

  let bundle: PublicPostOgBundle | null = null;
  try {
    bundle = await ctx.runQuery(internal.gigaSocial.getPublicPostOgBundle, {
      postId: postId as Id<"socialPosts">,
    });
  } catch {
    bundle = null;
  }

  if (!bundle) {
    const html = renderGigaSocialUnavailableHtml(postId);
    return new Response(html, {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=120",
      },
    });
  }

  const meta = buildGigaSocialOgMeta(bundle.post, undefined, bundle.mediaMetaJson);
  const html = renderGigaSocialPreviewHtml(meta, bundle.post.author);
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});
