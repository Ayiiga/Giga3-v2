"use client";

import { useState, type ReactNode } from "react";
import { getPostMediaKind, getPostMediaUrls } from "@/lib/gigasocial/postMedia";
import type { SocialPost } from "@/lib/gigasocial/types";

export function SocialPostGrid({
  posts,
  renderPost,
}: {
  posts: SocialPost[];
  renderPost: (post: SocialPost) => ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = posts.find((post) => post._id === selectedId);

  if (selected)
    return (
      <div className="space-y-3">
        <button
          type="button"
          className="min-h-11 rounded-full border px-4"
          onClick={() => setSelectedId(null)}
        >
          ← All posts
        </button>
        {renderPost(selected)}
      </div>
    );

  return (
    <ul className="discover-tiles">
      {posts.map((post) => {
        const kind = getPostMediaKind(post);
        const image =
          post.videoThumbnailUrl ||
          (["image", "gallery", "photo-music"].includes(kind)
            ? getPostMediaUrls(post)[0]
            : undefined);
        return (
          <li key={post._id}>
            <button
              className="discover-tile w-full text-left"
              type="button"
              onClick={() => setSelectedId(post._id)}
            >
              {image && <img loading="lazy" alt="" src={image} />}
              <span>
                <strong>{post.body || post.postType}</strong>
                <small>
                  @{post.author.handle} · {post.viewCount ?? 0} views
                </small>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
