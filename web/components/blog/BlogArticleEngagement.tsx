"use client";

import { BlogShare } from "@/components/blog/BlogShare";
import { BlogViewCount } from "@/components/blog/BlogViewCount";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";

type BlogArticleEngagementProps = {
  slug: string;
  title: string;
  path: string;
};

export function BlogArticleMetaStats({ slug }: { slug: string }) {
  return (
    <ConvexAppShell>
      <div>
        <dt className="sr-only">Views</dt>
        <dd>
          <BlogViewCount slug={slug} recordOnMount compact />
        </dd>
      </div>
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
