"use client";

import { BlogCard } from "@/components/blog/BlogCard";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import type { BlogPostWithPath } from "@/lib/blog/types";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo } from "react";

function BlogGridInner({ posts }: { posts: readonly BlogPostWithPath[] }) {
  const slugs = useMemo(() => posts.map((post) => post.slug), [posts]);
  const viewCounts = useQuery(api.blogStats.getStatsBatch, { slugs });

  if (posts.length === 0) {
    return (
      <p className="mt-10 text-base text-muted" role="status">
        No articles in this category yet. Check back soon.
      </p>
    );
  }

  return (
    <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <li key={post.slug} className="min-w-0">
          <BlogCard post={post} viewCount={viewCounts?.[post.slug]} viewsLoading={!viewCounts} />
        </li>
      ))}
    </ul>
  );
}

export function BlogGrid({ posts }: { posts: readonly BlogPostWithPath[] }) {
  return (
    <ConvexAppShell>
      <BlogGridInner posts={posts} />
    </ConvexAppShell>
  );
}
