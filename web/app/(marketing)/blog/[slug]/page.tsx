import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { BlogArticleJsonLd } from "@/components/blog/BlogArticleJsonLd";
import { blogArticleMetadata } from "@/lib/blog/metadata";
import { getAllBlogPosts, getBlogPostBySlug } from "@/lib/blog/posts";

type PageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return getAllBlogPosts().map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: PageProps) {
  const entry = getBlogPostBySlug(params.slug);
  if (!entry) return {};
  return blogArticleMetadata(entry.post);
}

export default function BlogArticlePage({ params }: PageProps) {
  const entry = getBlogPostBySlug(params.slug);
  if (!entry) notFound();

  const { post, Body } = entry;
  const path = `/blog/${post.slug}`;

  return (
    <>
      <BlogArticleJsonLd post={post} path={path} />
      <div className="marketing-stable bg-white">
        <Container className="section-padding">
          <Body post={post} />
        </Container>
      </div>
    </>
  );
}
