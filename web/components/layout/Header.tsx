"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { InstallButton } from "@/components/pwa/InstallButton";
import { navLinks, siteConfig } from "@/lib/site";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/**
 * Static sticky header — no scroll listeners or style transitions.
 * Scroll-driven re-renders caused visible tearing/ghosting on mobile Chrome/PWA.
 */
export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white py-3 shadow-sm">
      <Container className="flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-foreground">
          <BrandLogo size={36} priority className="shadow-none ring-0" />
          <span>{siteConfig.name}</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-base font-semibold text-foreground hover:text-accent"
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
        <div className="border-t border-border bg-white md:hidden">
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
