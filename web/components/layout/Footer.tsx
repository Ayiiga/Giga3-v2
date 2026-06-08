import { Container } from "@/components/ui/Container";
import { navLinks, siteConfig } from "@/lib/site";
import { BrandLogo } from "@/components/brand/BrandLogo";
import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-zinc-50">
      <Container className="section-padding !py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 font-semibold">
              <BrandLogo size={36} />
              {siteConfig.name}
            </Link>
            <p className="mt-4 max-w-sm text-sm text-muted">{siteConfig.description}</p>
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
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a href="/pricing" className="hover:text-foreground">
                  App pricing
                </a>
              </li>
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

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted sm:flex-row">
          <p>© {year} {siteConfig.name}. All rights reserved.</p>
          <p>Built for Cloudflare Pages · PWA ready</p>
        </div>
      </Container>
    </footer>
  );
}
