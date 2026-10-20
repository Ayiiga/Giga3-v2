import { CollapsibleSeoIntro } from "@/components/seo/CollapsibleSeoIntro";
import { Container } from "@/components/ui/Container";
import { GIGA3_PRODUCT_LINKS } from "@/lib/seo/productLinks";
import type { ReactNode } from "react";

type ProductSeoHeaderProps = {
  title: string;
  description: string;
  /** Extra paragraph with feature detail — keep factual and concise. */
  detail?: string;
  /** Optional product/cover image shown above the title (e.g. Marketplace books). */
  coverImageUrl?: string | null;
  coverImageAlt?: string;
  /** Omit product nav when the page already includes rich linking. */
  showProductNav?: boolean;
  /** Tighter padding for app pages that hydrate immediately below the header. */
  compact?: boolean;
  /**
   * Collapse longer intro behind Learn more / Read more.
   * Defaults to on when `compact` is true (product app shells).
   */
  collapsible?: boolean;
  expandLabel?: string;
  collapseLabel?: string;
  /** Optional CTA row (e.g. Browse Products / Start Selling). */
  actions?: ReactNode;
  className?: string;
};

/** Server-rendered H1 and intro copy for product pages before client apps hydrate. */
export function ProductSeoHeader({
  title,
  description,
  detail,
  coverImageUrl,
  coverImageAlt,
  showProductNav = true,
  compact = false,
  collapsible,
  expandLabel,
  collapseLabel,
  actions,
  className = "",
}: ProductSeoHeaderProps) {
  const collapseIntro = collapsible ?? compact;
  const bodyClass = compact
    ? "text-sm leading-5 text-muted sm:text-[15px] sm:leading-6"
    : "section-lead";
  const cover = coverImageUrl?.trim() || "";

  return (
    <header className={`border-b border-border bg-white ${className}`.trim()}>
      <Container className={compact ? "py-3 sm:py-4" : "py-8 sm:py-10"}>
        <div className={compact ? "mx-auto max-w-5xl" : "mx-auto max-w-3xl"}>
          {cover ? (
            <div
              className="mb-4 overflow-hidden rounded-xl border border-border bg-violet-950/[0.04] sm:mb-5"
              data-testid="product-seo-cover"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover}
                alt={coverImageAlt?.trim() || title}
                className="mx-auto max-h-72 w-full object-contain sm:max-h-80"
                loading="eager"
                decoding="async"
              />
            </div>
          ) : null}
          <h1
            className={
              compact
                ? "text-xl font-bold tracking-tight text-foreground sm:text-2xl"
                : "page-title"
            }
          >
            {title}
          </h1>
          {collapseIntro ? (
            <CollapsibleSeoIntro
              description={description}
              detail={detail}
              bodyClass={bodyClass}
              expandLabel={expandLabel}
              collapseLabel={collapseLabel}
            />
          ) : (
            <>
              <p className={compact ? `mt-1.5 ${bodyClass}` : "section-lead mt-4"}>
                {description}
              </p>
              {detail ? (
                <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
              ) : null}
            </>
          )}
          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
          {showProductNav ? (
            <nav
              className="mt-6 flex flex-wrap gap-x-5 gap-y-3"
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
          ) : null}
        </div>
      </Container>
    </header>
  );
}
