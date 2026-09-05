"use client";

import { BlogShare } from "@/components/blog/BlogShare";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { formatCompactCount } from "@/lib/gigasocial/ogMeta";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Eye } from "lucide-react";
import { useEffect, useRef } from "react";

function BlogViewStats({ slug }: { slug: string }) {
  const stats = useQuery(api.blogStats.getStats, { slug });
  const recordView = useMutation(api.blogStats.recordView);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    void recordView({ slug });
  }, [recordView, slug]);

  const viewCount = stats?.viewCount ?? 0;
  if (viewCount <= 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5">
      <Eye className="h-3.5 w-3.5" aria-hidden />
      <dd>{formatCompactCount(viewCount)} views</dd>
    </div>
  );
}

type BlogArticleEngagementProps = {
  slug: string;
  title: string;
  path: string;
};

export function BlogArticleMetaStats({ slug }: { slug: string }) {
  return (
    <ConvexAppShell>
      <BlogViewStats slug={slug} />
    </ConvexAppShell>
  );
}

export function BlogArticleShareSection({ slug, title, path }: BlogArticleEngagementProps) {
  return (
    <ConvexAppShell>
      <BlogShare title={title} path={path} slug={slug} />
    </ConvexAppShell>
  );
}
