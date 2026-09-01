import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { InstallButton } from "@/components/pwa/InstallButton";
import { GIGA3_PRODUCT_LINKS } from "@/lib/seo/productLinks";

type PublicProductIntroProps = {
  title: string;
  description: string;
  audience?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  /** Tighter layout when the page app loads directly below. */
  compact?: boolean;
};

/** Static, lightweight copy that keeps public product pages useful before JavaScript loads. */
export function PublicProductIntro({
  title,
  description,
  audience,
  primaryHref = "/chat/login",
  primaryLabel = "Get Started",
  secondaryHref,
  secondaryLabel,
  compact = false,
}: PublicProductIntroProps) {
  return (
    <section className={compact ? "border-b border-border bg-white py-4 sm:py-5" : "bg-white py-12 sm:py-16"}>
      <Container>
        <div className="mx-auto max-w-3xl">
          <h1 className={compact ? "text-xl font-bold tracking-tight sm:text-2xl" : "page-title"}>
            {title}
          </h1>
          <p className={compact ? "mt-2 text-sm leading-6 text-muted sm:text-base" : "section-lead mt-5"}>
            {description}
            {audience ? ` Built for ${audience}.` : ""}
          </p>
          <div className={compact ? "mt-3 flex flex-wrap gap-2" : "mt-8 flex flex-wrap gap-3"}>
            <ButtonLink href={primaryHref} size={compact ? "sm" : "md"}>
              {primaryLabel}
            </ButtonLink>
            {secondaryHref && secondaryLabel ? (
              <ButtonLink href={secondaryHref} variant="secondary" size={compact ? "sm" : "md"}>
                {secondaryLabel}
              </ButtonLink>
            ) : null}
            {!compact ? (
              <>
                <ButtonLink href="/chat" variant="secondary">Open Giga3 AI</ButtonLink>
                <ButtonLink href="/download" variant="outline">Install Giga3 AI</ButtonLink>
                <InstallButton variant="outline" />
              </>
            ) : null}
          </div>
          {!compact ? (
          <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-3" aria-label="Explore Giga3 AI products">
            {GIGA3_PRODUCT_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-accent hover:underline">
                {link.label}
              </a>
            ))}
          </nav>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
