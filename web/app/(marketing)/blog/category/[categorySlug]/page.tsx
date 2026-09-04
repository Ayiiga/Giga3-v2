import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { BlogGrid } from "@/components/blog/BlogGrid";
import { BlogBreadcrumbs } from "@/components/blog/BlogBreadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  BLOG_CATEGORIES,
  categoryNameForSlug,
  blogCategoryPath,
  type BlogCategorySlug,
} from "@/lib/blog/categories";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import { getBlogPostsByCategory } from "@/lib/blog/posts";

type PageProps = {
  params: { categorySlug: string };
};

export function generateStaticParams() {
  return BLOG_CATEGORIES.map((c) => ({ categorySlug: c.slug }));
}

export function generateMetadata({ params }: PageProps) {
  const name = categoryNameForSlug(params.categorySlug);
  if (!name) return {};
  return publicMetadata({
    path: `/blog/category/${params.categorySlug}`,
    title: `${name} — Giga3 AI Blog`,
    description: `Articles about ${name.toLowerCase()} from the Giga3 AI blog — practical AI guides for Ghana and Africa.`,
  });
}

export default function BlogCategoryPage({ params }: PageProps) {
  const name = categoryNameForSlug(params.categorySlug);
  if (!name) notFound();

  const posts = getBlogPostsByCategory(name);
  const path = blogCategoryPath(params.categorySlug as BlogCategorySlug);

  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Blog", path: "/blog" },
          { name, path: path.slice(0, -1) },
        ]}
      />
      <div className="marketing-stable bg-white">
        <Container className="section-padding">
          <div className="mx-auto max-w-5xl">
            <BlogBreadcrumbs
              items={[
                { name: "Giga3 AI", href: "/" },
                { name: "Blog", href: "/blog/" },
                { name },
              ]}
            />
            <header className="mt-6 max-w-3xl">
              <h1 className="page-title">{name}</h1>
              <p className="section-lead mt-4">
                Articles tagged under <strong>{name}</strong> — AI guides for students, creators, and
                businesses in Ghana.
              </p>
            </header>

            <nav aria-label="All blog categories" className="mt-8">
              <ul className="flex flex-wrap gap-2">
                {BLOG_CATEGORIES.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={blogCategoryPath(category.slug)}
                      aria-current={category.slug === params.categorySlug ? "page" : undefined}
                      className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        category.slug === params.categorySlug
                          ? "border-violet-400 bg-violet-50 text-violet-900"
                          : "border-border text-foreground hover:border-violet-300 hover:bg-violet-50"
                      }`}
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <BlogGrid posts={posts} />
          </div>
        </Container>
      </div>
    </>
  );
}
