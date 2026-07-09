"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { InstallButton } from "@/components/pwa/InstallButton";
import { navLinks, siteConfig } from "@/lib/site";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Menu, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/**
 * Static sticky header — no scroll listeners or style transitions.
 * Scroll-driven re-renders caused visible tearing/ghosting on mobile Chrome/PWA.
 */
export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white">
      <Container className="flex min-h-14 items-center justify-between gap-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 text-base font-semibold tracking-tight text-foreground">
            <BrandLogo size={32} priority className="shadow-none ring-0" />
            <span>{siteConfig.name}</span>
          </Link>
          <Link
            href={siteConfig.links.gigasocial}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-white text-muted hover:border-accent/30 hover:bg-accent/5 hover:text-accent"
            aria-label="Open GigaSocial feed"
            title="GigaSocial"
          >
            <UsersRound className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-base font-medium text-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
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
          <Container className="grid grid-cols-1 gap-1 py-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="min-h-11 flex items-center px-2 text-base text-muted hover:text-foreground"
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
