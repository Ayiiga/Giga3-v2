import { Container } from "@/components/ui/Container";
import { navLinks, siteConfig } from "@/lib/site";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-black/40">
      <Container className="section-padding !py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20 text-accent">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              {siteConfig.name}
            </Link>
            <p className="mt-4 max-w-sm text-sm text-muted">{siteConfig.description}</p>
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
                <a href={siteConfig.links.pricing} className="hover:text-foreground">
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
