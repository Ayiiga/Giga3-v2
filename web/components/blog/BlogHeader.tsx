import Image from "next/image";
import Link from "next/link";
import { BlogAuthor } from "@/components/blog/BlogAuthor";
import { BlogBreadcrumbs } from "@/components/blog/BlogBreadcrumbs";
import {
  BlogArticleMetaStats,
  BlogArticleShareSection,
} from "@/components/blog/BlogArticleEngagement";
import { BlogTableOfContents } from "@/components/blog/BlogTableOfContents";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import { categorySlugForName, blogCategoryPath } from "@/lib/blog/categories";
import type { BlogPostWithPath } from "@/lib/blog/types";
import type { TocItem } from "@/components/blog/BlogTableOfContents";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

type BlogArticleLayoutProps = {
  post: BlogPostWithPath;
  toc: readonly TocItem[];
  children: React.ReactNode;
  cta?: React.ReactNode;
};

export function BlogArticleLayout({ post, toc, children, cta }: BlogArticleLayoutProps) {
  const categorySlug = categorySlugForName(post.category);
  const path = `/blog/${post.slug}`;

  return (
    <article className="mx-auto max-w-3xl">
      <BlogBreadcrumbs
        items={[
          { name: "Giga3 AI", href: "/" },
          { name: "Blog", href: "/blog/" },
          { name: post.title },
        ]}
      />

      <header className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          {categorySlug ? (
            <Link href={blogCategoryPath(categorySlug)} className="hover:underline">
              {post.category}
            </Link>
          ) : (
            post.category
          )}
        </p>
        <h1 className="page-title mt-3">{post.title}</h1>
        <p className="section-lead mt-4">{post.excerpt}</p>

        <div className="mt-6 flex flex-wrap items-center gap-4 border-y border-border py-4">
          <BlogAuthor name={post.author} />
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <div>
              <dt className="sr-only">Published</dt>
              <dd>
                Published{" "}
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              </dd>
            </div>
            {post.updatedAt ? (
              <div>
                <dt className="sr-only">Updated</dt>
                <dd>
                  Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="sr-only">Reading time</dt>
              <dd>{post.readingTime}</dd>
            </div>
            <BlogArticleMetaStats slug={post.slug} />
          </dl>
        </div>

        <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-slate-50">
          <Image
            src={post.featuredImage}
            alt={post.featuredImageAlt}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
      </header>

      <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-10">
        <section className="min-w-0 space-y-6">{children}</section>
        <aside className="mt-8 space-y-6 lg:mt-0">
          <BlogTableOfContents items={toc} />
        </aside>
      </div>

      {cta}

      <RelatedPosts current={post} />

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <BlogArticleShareSection slug={post.slug} title={post.title} path={path} />
        <nav aria-label="Back to blog" className="flex items-center">
          <Link
            href="/blog/"
            className="text-sm font-semibold text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
          >
            ← Back to blog
          </Link>
        </nav>
      </div>
    </article>
  );
}
