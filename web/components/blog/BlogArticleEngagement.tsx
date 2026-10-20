"use client";

import { BlogAggregateRatingJsonLd } from "@/components/blog/BlogAggregateRatingJsonLd";
import { BlogShare } from "@/components/blog/BlogShare";
import { BlogStarRating } from "@/components/blog/BlogStarRating";
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
      <div>
        <dt className="sr-only">Rating</dt>
        <dd>
          <BlogStarRating slug={slug} variant="compact" />
        </dd>
      </div>
    </ConvexAppShell>
  );
}

export function BlogArticleRatingSection({ slug, path }: { slug: string; path: string }) {
  return (
    <ConvexAppShell>
      <BlogAggregateRatingJsonLd slug={slug} path={path} />
      <BlogStarRating slug={slug} variant="full" />
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
