import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { InstallButton } from "@/components/pwa/InstallButton";

type PublicProductIntroProps = {
  title: string;
  description: string;
  audience: string;
  primaryHref?: string;
  primaryLabel?: string;
};

import { GIGA3_PRODUCT_LINKS } from "@/lib/seo/productLinks";

/** Static, lightweight copy that keeps public product pages useful before JavaScript loads. */
export function PublicProductIntro({
  title,
  description,
  audience,
  primaryHref = "/chat/login",
  primaryLabel = "Get Started",
}: PublicProductIntroProps) {
  return (
    <section className="bg-white py-12 sm:py-16">
      <Container>
        <div className="mx-auto max-w-3xl">
          <h1 className="page-title">{title}</h1>
          <p className="section-lead mt-5">{description}</p>
          <p className="mt-4 text-base leading-7 text-muted">Built for {audience}.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={primaryHref}>{primaryLabel}</ButtonLink>
            <ButtonLink href="/chat" variant="secondary">Open Giga3 AI</ButtonLink>
            <ButtonLink href="/download" variant="outline">Install Giga3 AI</ButtonLink>
            <InstallButton variant="outline" />
          </div>
          <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-3" aria-label="Explore Giga3 AI products">
            {GIGA3_PRODUCT_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-accent hover:underline">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </Container>
    </section>
  );
}
