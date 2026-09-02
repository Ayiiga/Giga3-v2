import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { PRODUCT_CATALOG } from "@/lib/seo/productCatalog";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for does not exist on Giga3 AI.",
  robots: { index: false, follow: true },
};

const POPULAR = PRODUCT_CATALOG.filter((p) =>
  ["/chat", "/gigalearn", "/media", "/gigasocial", "/marketplace", "/pricing"].includes(p.href)
);

export default function NotFound() {
  return (
    <main id="main-content" className="marketing-stable bg-white">
      <Container className="section-padding">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">404</p>
          <h1 className="page-title mt-2">We couldn&apos;t find that page</h1>
          <p className="section-lead mx-auto mt-4 max-w-lg">
            The link may be outdated or mistyped. Everything on Giga3 AI is one click away from
            the home page or the feature overview.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/" size="lg">
              Go to home page
            </ButtonLink>
            <ButtonLink href="/features/" variant="secondary" size="lg">
              Browse all features
            </ButtonLink>
          </div>
          <nav aria-label="Popular destinations" className="mt-12 text-left">
            <h2 className="text-sm font-semibold text-foreground">Popular destinations</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {POPULAR.map((p) => (
                <li key={p.href}>
                  <Link
                    href={`${p.href}/`}
                    className="block rounded-xl border border-border px-4 py-3 text-sm hover:border-violet-300"
                  >
                    <span className="font-medium text-foreground">{p.name}</span>
                    <span className="block text-xs text-muted">{p.tagline}</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/pricing/"
                  className="block rounded-xl border border-border px-4 py-3 text-sm hover:border-violet-300"
                >
                  <span className="font-medium text-foreground">Pricing</span>
                  <span className="block text-xs text-muted">Plans in GHS via Paystack</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </Container>
    </main>
  );
}
