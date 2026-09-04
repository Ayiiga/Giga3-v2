import { BlogCard } from "@/components/blog/BlogCard";
import { getRelatedBlogPosts } from "@/lib/blog/posts";
import type { BlogPostWithPath } from "@/lib/blog/types";

type RelatedPostsProps = {
  current: BlogPostWithPath;
  posts?: BlogPostWithPath[];
};

export function RelatedPosts({ current, posts }: RelatedPostsProps) {
  const related = posts ?? getRelatedBlogPosts(current, 3);
  if (related.length === 0) return null;

  return (
    <section aria-labelledby="related-posts-heading" className="mt-12 border-t border-border pt-10">
      <h2 id="related-posts-heading" className="text-xl font-semibold text-foreground">
        Related articles
      </h2>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2">
        {related.map((post) => (
          <li key={post.slug}>
            <BlogCard post={post} />
          </li>
        ))}
      </ul>
    </section>
  );
}
