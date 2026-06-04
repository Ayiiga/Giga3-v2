"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { InstallButton } from "@/components/pwa/InstallButton";
import { navLinks, siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-border bg-white/95 py-3 shadow-md" : "bg-white/80 py-4"
      )}
    >
      <Container className="flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-foreground">
          <BrandLogo size={36} priority />
          <span>{siteConfig.name}</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-base font-semibold text-foreground transition-colors hover:text-accent"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <InstallButton size="sm" variant="ghost" />
          <ButtonLink href={siteConfig.links.login} variant="ghost" size="sm">
            Log in
          </ButtonLink>
          <ButtonLink href={siteConfig.links.dashboard} size="sm">
            Open app
          </ButtonLink>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X aria-hidden /> : <Menu aria-hidden />}
        </Button>
      </Container>

      {open && (
        <div className="glass border-t md:hidden">
          <Container className="grid grid-cols-1 gap-3 py-5">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-muted hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <InstallButton className="w-full" />
            <ButtonLink href={siteConfig.links.login} variant="secondary" className="w-full">
              Log in
            </ButtonLink>
            <ButtonLink href={siteConfig.links.dashboard} className="w-full">
              Open app
            </ButtonLink>
          </Container>
        </div>
      )}
    </header>
  );
}
