import Link from "next/link";
import Image from "next/image";
import type { BlogPostWithPath } from "@/lib/blog/types";
import { categorySlugForName, blogCategoryPath } from "@/lib/blog/categories";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function BlogCard({ post }: { post: BlogPostWithPath }) {
  const categorySlug = categorySlugForName(post.category);

  return (
    <article className="saas-card flex h-full flex-col overflow-hidden rounded-2xl border border-border transition hover:border-violet-300 hover:shadow-md">
      <Link href={post.href} className="block">
        <div className="relative aspect-[16/9] w-full bg-slate-50">
          <Image
            src={post.featuredImage}
            alt={post.featuredImageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          {categorySlug ? (
            <Link href={blogCategoryPath(categorySlug)} className="hover:underline">
              {post.category}
            </Link>
          ) : (
            post.category
          )}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">
          <Link href={post.href} className="hover:text-accent">
            {post.title}
          </Link>
        </h2>
        <p className="mt-2 flex-1 text-base leading-relaxed text-muted">{post.excerpt}</p>
        <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <div>
            <dt className="sr-only">Published</dt>
            <dd>
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            </dd>
          </div>
          <div>
            <dt className="sr-only">Reading time</dt>
            <dd>{post.readingTime}</dd>
          </div>
          <div>
            <dt className="sr-only">Author</dt>
            <dd>{post.author}</dd>
          </div>
        </dl>
        <p className="mt-4">
          <Link
            href={post.href}
            className="inline-flex items-center text-sm font-semibold text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
            aria-label={`Read article: ${post.title}`}
          >
            Read article
          </Link>
        </p>
      </div>
    </article>
  );
}
