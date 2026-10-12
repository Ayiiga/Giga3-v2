import { CollapsibleSeoIntro } from "@/components/seo/CollapsibleSeoIntro";
import { Container } from "@/components/ui/Container";
import { GIGA3_PRODUCT_LINKS } from "@/lib/seo/productLinks";

type ProductSeoHeaderProps = {
  title: string;
  description: string;
  /** Extra paragraph with feature detail — keep factual and concise. */
  detail?: string;
  /** Omit product nav when the page already includes rich linking. */
  showProductNav?: boolean;
  /** Tighter padding for app pages that hydrate immediately below the header. */
  compact?: boolean;
  /**
   * Collapse longer intro behind Read more / Read less.
   * Defaults to on when `compact` is true (product app shells).
   */
  collapsible?: boolean;
  className?: string;
};

/** Server-rendered H1 and intro copy for product pages before client apps hydrate. */
export function ProductSeoHeader({
  title,
  description,
  detail,
  showProductNav = true,
  compact = false,
  collapsible,
  className = "",
}: ProductSeoHeaderProps) {
  const collapseIntro = collapsible ?? compact;
  const bodyClass = compact
    ? "text-sm leading-5 text-muted sm:text-base sm:leading-6"
    : "section-lead";

  return (
    <header className={`border-b border-border bg-white ${className}`.trim()}>
      <Container className={compact ? "py-3 sm:py-4" : "py-8 sm:py-10"}>
        <div className="mx-auto max-w-3xl">
          <h1 className={compact ? "text-lg font-bold tracking-tight sm:text-xl" : "page-title"}>
            {title}
          </h1>
          {collapseIntro ? (
            <CollapsibleSeoIntro
              description={description}
              detail={detail}
              bodyClass={bodyClass}
            />
          ) : (
            <>
              <p className={compact ? `mt-2 ${bodyClass}` : "section-lead mt-4"}>
                {description}
              </p>
              {detail ? (
                <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
              ) : null}
            </>
          )}
          {showProductNav ? (
            <nav
              className="mt-8 flex flex-wrap gap-x-5 gap-y-3"
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
