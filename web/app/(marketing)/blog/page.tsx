import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { PUBLIC_ARTICLES } from "@/lib/seo/articles";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata = publicMetadata({
  path: "/blog",
  title: "Giga3 AI Blog — Guides for Students, Creators and Businesses",
  description:
    "Practical guides on using AI in Ghana and across Africa: study tools, creator workflows, business automation and Giga3 AI product explainers.",
});

export default function BlogIndexPage() {
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
          <div className="mx-auto max-w-3xl">
            <h1 className="page-title">Giga3 AI Blog</h1>
            <p className="section-lead mt-4">
              Guides and explainers written for people using AI in Ghana and across Africa. Every
              article is reviewed against what the product actually does today.
            </p>
            <ul className="mt-10 space-y-5">
              {PUBLIC_ARTICLES.map((article) => (
                <li key={article.href}>
                  <Link
                    href={`${article.href}/`}
                    className="saas-card block rounded-2xl border border-border p-5 transition hover:border-violet-300 hover:shadow-md"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                      {article.audience} ·{" "}
                      <time dateTime={article.publishedAt}>
                        {new Date(article.publishedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </time>
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-foreground">{article.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{article.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </div>
    </>
  );
}
