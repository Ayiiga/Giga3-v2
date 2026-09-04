import { BlogCard } from "@/components/blog/BlogCard";
import type { BlogPostWithPath } from "@/lib/blog/types";

export function BlogGrid({ posts }: { posts: readonly BlogPostWithPath[] }) {
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
          <BlogCard post={post} />
        </li>
      ))}
    </ul>
  );
}
