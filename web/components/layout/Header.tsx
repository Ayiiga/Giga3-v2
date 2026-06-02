"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { InstallButton } from "@/components/pwa/InstallButton";
import { navLinks, siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Menu, Sparkles, X } from "lucide-react";
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
        scrolled ? "glass border-b py-3" : "bg-transparent py-4"
      )}
    >
      <Container className="flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20 text-accent">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <span>{siteConfig.name}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <InstallButton size="sm" variant="ghost" />
          <ButtonLink href={siteConfig.links.login} variant="ghost" size="sm" external>
            Log in
          </ButtonLink>
          <ButtonLink href={siteConfig.links.dashboard} size="sm" external>
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
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </Container>

      {open && (
        <div className="glass border-t md:hidden">
          <Container className="flex flex-col gap-4 py-4">
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
            <ButtonLink href={siteConfig.links.login} variant="secondary" external className="w-full">
              Log in
            </ButtonLink>
            <ButtonLink href={siteConfig.links.dashboard} className="w-full" external>
              Open app
            </ButtonLink>
          </Container>
        </div>
      )}
    </header>
  );
}
