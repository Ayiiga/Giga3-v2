import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  ArticleH2,
  BulletList,
  FaqSection,
  Prose,
  RelatedReading,
} from "@/components/seo/SeoArticleParts";
import type { GhanaLandingConfig } from "@/lib/seo/ghanaLandingPages";

/** Static Ghana/Africa SEO landing shell — no client JS, crawlable without Convex. */
export function GhanaSeoLandingPage({ config }: { config: GhanaLandingConfig }) {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "AI for Ghana", path: "/ai-for-ghana" },
          { name: config.breadcrumbLabel, path: config.path },
        ]}
      />
      <JsonLd faq={config.faq} />
      <div className="marketing-stable bg-white">
        <Container className="section-padding">
          <article className="mx-auto max-w-3xl">
            <header>
              <h1 className="page-title">{config.h1}</h1>
              <p className="section-lead mt-4">{config.lead}</p>
            </header>

            <div className="mt-8 space-y-5">
              {config.intro.map((paragraph) => (
                <Prose key={paragraph.slice(0, 48)}>{paragraph}</Prose>
              ))}
            </div>

            {config.sections.map((section) => (
              <section key={section.heading} className="mt-12 space-y-4">
                <ArticleH2>{section.heading}</ArticleH2>
                {section.paragraphs.map((paragraph) => (
                  <Prose key={paragraph.slice(0, 48)}>{paragraph}</Prose>
                ))}
                {section.bullets ? <BulletList items={section.bullets} /> : null}
              </section>
            ))}

            <section className="mt-12 rounded-2xl border border-border bg-slate-50 p-6">
              <p className="text-lg font-semibold text-foreground">Ready to explore on Giga3 AI?</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ButtonLink href={config.primaryCta.href} size="lg">
                  {config.primaryCta.label}
                </ButtonLink>
                {config.secondaryCta ? (
                  <ButtonLink href={config.secondaryCta.href} variant="secondary" size="lg">
                    {config.secondaryCta.label}
                  </ButtonLink>
                ) : null}
              </div>
              <p className="mt-6 text-sm text-muted">
                Giga3 AI — Built in Africa. Powered by AI. Designed for Everyone.
              </p>
            </section>

            <FaqSection items={config.faq} />
            <RelatedReading links={config.relatedReading} />
          </article>
        </Container>
      </div>
    </>
  );
}
