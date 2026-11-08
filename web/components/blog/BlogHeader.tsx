import Link from "next/link";
import { BlogAuthor } from "@/components/blog/BlogAuthor";
import { BlogBreadcrumbs } from "@/components/blog/BlogBreadcrumbs";
import {
  BlogArticleMetaStats,
  BlogArticleRatingSection,
  BlogArticleShareSection,
} from "@/components/blog/BlogArticleEngagement";
import { BlogImage } from "@/components/blog/BlogImage";
import { BlogPushSubscribe } from "@/components/blog/BlogPushSubscribe";
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

        <div className="mt-8 max-w-full">
          <BlogImage
            src={post.featuredImage}
            alt={post.featuredImageAlt}
            priority
            aspect="16/9"
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

      <aside
        aria-label="Explore Giga3 AI"
        className="mt-12 rounded-2xl border border-violet-200 p-6 sm:p-7"
        style={{
          backgroundColor: "#ffffff",
          backgroundImage: "linear-gradient(135deg, #f5f3ff 0%, #ffffff 52%, #eef2ff 100%)",
          color: "#111827",
          colorScheme: "light",
        }}
      >
        <p
          className="text-xs font-bold uppercase tracking-[0.16em]"
          style={{ color: "#5b21b6" }}
        >
          Keep exploring with Giga3
        </p>
        <h2
          className="mt-2 text-xl font-bold sm:text-2xl"
          style={{ color: "#111827" }}
        >
          Turn what you have read into something you can do.
        </h2>
        <p
          className="mt-2 max-w-2xl text-sm leading-6"
          style={{ color: "#374151" }}
        >
          Ask Giga3 AI Chat to explain an idea, plan a project or help you think through your next
          step. And discover the GigaSocial Awards — a space celebrating creators across Ghana and
          Africa, with free nominations and free voting.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/chat/login/"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
          >
            Try Giga3 AI Chat
          </Link>
          <Link
            href="/gigasocial/awards/"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-violet-300 bg-white px-5 py-2.5 text-sm font-semibold text-violet-900 transition hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
          >
            Explore GigaSocial Awards
          </Link>
        </div>
      </aside>

      <div className="mt-10">
        <BlogArticleRatingSection slug={post.slug} path={path} />
      </div>

      <div className="mt-10">
        <BlogPushSubscribe />
      </div>

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
