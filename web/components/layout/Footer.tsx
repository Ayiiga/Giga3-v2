import { Container } from "@/components/ui/Container";
import { VisionTagline } from "@/components/vision/VisionTagline";
import { FOOTER_PRODUCT_LINKS } from "@/lib/seo/productLinks";
import { GEO_POSITIONING_STATEMENT, siteConfig } from "@/lib/site";
import { legalNavLinks } from "@/lib/legal/content";
import { BrandLogo } from "@/components/brand/BrandLogo";
import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-zinc-50">
      <Container className="section-padding !py-14">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 font-semibold">
              <BrandLogo size={36} alt="" />
              {siteConfig.name}
            </Link>
            <p className="mt-4 max-w-sm text-sm text-muted">{siteConfig.description}</p>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted" data-testid="geo-positioning">
              {GEO_POSITIONING_STATEMENT}
            </p>
            <VisionTagline className="mt-3 max-w-sm" variant="subtle" />
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted">
              Designed and founded by{" "}
              <span className="text-foreground">
                {siteConfig.founder.name} ({siteConfig.founder.alias})
              </span>
              , {siteConfig.founder.role} from {siteConfig.founder.location} —{" "}
              {siteConfig.founder.organization}.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Product</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {FOOTER_PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {legalNavLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Connect</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li>
                <a href={`mailto:${siteConfig.contact.email}`} className="hover:text-foreground">
                  {siteConfig.contact.email}
                </a>
              </li>
              <li>
                <a href={siteConfig.links.github} className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 border-t border-border pt-8" aria-label="Startup directory recognition">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Featured on FreeStartupDirectories
          </p>
          <a
            href="https://freestartupdirectories.com/tools/giga3-ai"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View Giga3 AI on FreeStartupDirectories"
            className="inline-flex items-center justify-center rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <img
              src="https://freestartupdirectories.com/badges/featured-on-fsd.svg"
              alt="Featured on FreeStartupDirectories"
              width={220}
              height={54}
              loading="lazy"
              decoding="async"
            />
          </a>
        </div>

        <div className="mt-5 flex flex-col items-center gap-2" aria-label="VibeRank app listing">
          <a
            href="https://viberank.dev/apps/Giga3%20AI"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View Giga3 AI on VibeRank"
            className="inline-flex max-w-full items-center justify-center rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <img
              src="https://viberank.dev/badge?app=Giga3%20AI&theme=dark"
              alt="Giga3 AI on VibeRank"
              width={180}
              height={40}
              loading="lazy"
              decoding="async"
              className="h-auto max-w-full"
            />
          </a>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted sm:flex-row">
          <p>© {year} {siteConfig.name}. All rights reserved.</p>
          <p>Built for Cloudflare Pages · PWA ready</p>
        </div>
      </Container>
    </footer>
  );
}
