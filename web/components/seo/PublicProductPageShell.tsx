import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { GIGA3_PRODUCT_LINKS } from "@/lib/seo/productLinks";
import {
  ArticleH2,
  BulletList,
  Prose,
} from "@/components/seo/SeoArticleParts";

export type PublicProductPageShellProps = {
  title: string;
  description: string;
  audience: string;
  whatItDoes: string;
  whoFor: readonly string[];
  capabilities: readonly string[];
  giga3Connection: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  /** Use h2 when the interactive app above already provides the page h1. */
  titleAs?: "h1" | "h2";
};

/** Structured SEO shell for thin public product pages (static-export safe). */
export function PublicProductPageShell({
  title,
  description,
  audience,
  whatItDoes,
  whoFor,
  capabilities,
  giga3Connection,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  titleAs = "h1",
}: PublicProductPageShellProps) {
  const TitleTag = titleAs;
  return (
    <section className="marketing-stable bg-white py-12 sm:py-16">
      <Container>
        <div className="mx-auto max-w-3xl space-y-10">
          <header>
            <TitleTag className="page-title">{title}</TitleTag>
            <p className="section-lead mt-5">{description}</p>
            <p className="mt-3 text-sm text-muted">Built for {audience}.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={primaryHref}>{primaryLabel}</ButtonLink>
              {secondaryHref && secondaryLabel ? (
                <ButtonLink href={secondaryHref} variant="secondary">
                  {secondaryLabel}
                </ButtonLink>
              ) : null}
              <ButtonLink href="/features" variant="outline">
                Explore all products
              </ButtonLink>
            </div>
          </header>

          <section className="space-y-3">
            <ArticleH2>What it does</ArticleH2>
            <Prose>{whatItDoes}</Prose>
          </section>

          <section className="space-y-3">
            <ArticleH2>Who it is for</ArticleH2>
            <BulletList items={whoFor} />
          </section>

          <section className="space-y-3">
            <ArticleH2>Key capabilities</ArticleH2>
            <BulletList items={capabilities} />
          </section>

          <section className="space-y-3">
            <ArticleH2>How it connects to Giga3</ArticleH2>
            <Prose>{giga3Connection}</Prose>
          </section>

          <noscript>
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              JavaScript is required for the interactive app on this page. This overview remains
              available without scripts. Sign in at{" "}
              <a href="/chat/login" className="font-medium underline">
                /chat/login
              </a>{" "}
              to use your credits when the app loads.
            </p>
          </noscript>

          <nav
            className="flex flex-wrap gap-x-5 gap-y-3 border-t border-border pt-8"
            aria-label="Explore Giga3 AI products"
          >
            {GIGA3_PRODUCT_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-accent hover:underline"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </Container>
    </section>
  );
}
