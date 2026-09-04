import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { BlogBreadcrumbs } from "@/components/blog/BlogBreadcrumbs";

export default function BlogArticleNotFound() {
  return (
    <div className="marketing-stable bg-white">
      <Container className="section-padding">
        <div className="mx-auto max-w-lg text-center">
          <BlogBreadcrumbs
            items={[
              { name: "Giga3 AI", href: "/" },
              { name: "Blog", href: "/blog/" },
              { name: "Article not found" },
            ]}
          />
          <h1 className="page-title mt-8">Article not found</h1>
          <p className="section-lead mt-4">
            That blog post does not exist or may have been moved. Browse the latest guides on the
            blog index.
          </p>
          <p className="mt-8">
            <Link
              href="/blog/"
              className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Back to blog
            </Link>
          </p>
        </div>
      </Container>
    </div>
  );
}
