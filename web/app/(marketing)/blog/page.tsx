import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { BlogGrid } from "@/components/blog/BlogGrid";
import { BlogBreadcrumbs } from "@/components/blog/BlogBreadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { BLOG_CATEGORIES, blogCategoryPath } from "@/lib/blog/categories";
import { blogIndexMetadata } from "@/lib/blog/metadata";
import { getAllBlogPosts } from "@/lib/blog/posts";
import { PUBLIC_ARTICLES } from "@/lib/seo/articles";

export const metadata = blogIndexMetadata();

export default function BlogIndexPage() {
  const posts = getAllBlogPosts();

  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Blog", path: "/blog" },
        ]}
      />
      <div className="marketing-stable bg-white">
        <Container className="section-padding">
          <div className="mx-auto max-w-5xl">
            <BlogBreadcrumbs
              items={[
                { name: "Giga3 AI", href: "/" },
                { name: "Blog" },
              ]}
            />
            <header className="mx-auto mt-6 max-w-3xl text-center">
              <h1 className="page-title">
                Giga3 AI Blog — AI, Education &amp; Technology in Ghana
              </h1>
              <p className="section-lead mt-4">
                Practical guides on artificial intelligence, education, BECE and WASSCE preparation,
                tools for students and creators, business automation, and digital opportunities in
                Ghana and across Africa — written for real phones, real budgets, and responsible use.
              </p>
            </header>

            <nav aria-label="Blog categories" className="mt-10">
              <h2 className="sr-only">Browse by category</h2>
              <ul className="flex flex-wrap justify-center gap-2">
                {BLOG_CATEGORIES.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={blogCategoryPath(category.slug)}
                      className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-violet-300 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <section aria-labelledby="latest-articles-heading" className="mt-4">
              <h2 id="latest-articles-heading" className="sr-only">
                Latest articles
              </h2>
              <BlogGrid posts={posts} />
            </section>

            <section aria-labelledby="guides-heading" className="mt-16 border-t border-border pt-12">
              <h2 id="guides-heading" className="text-xl font-semibold text-foreground">
                Product guides &amp; explainers
              </h2>
              <p className="mt-2 text-base text-muted">
                Long-form pages about Giga3 AI products and AI adoption in Ghana.
              </p>
              <ul className="mt-6 space-y-4">
                {PUBLIC_ARTICLES.map((article) => (
                  <li key={article.href}>
                    <Link
                      href={`${article.href}/`}
                      className="saas-card block rounded-2xl border border-border p-5 transition hover:border-violet-300 hover:shadow-md"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                        {article.audience}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">{article.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{article.description}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </Container>
      </div>
    </>
  );
}
