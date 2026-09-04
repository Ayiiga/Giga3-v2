"use client";

import { siteConfig } from "@/lib/site";
import { useMemo } from "react";

type BlogShareProps = {
  title: string;
  path: string;
};

export function BlogShare({ title, path }: BlogShareProps) {
  const url = useMemo(() => new URL(path.endsWith("/") ? path : `${path}/`, siteConfig.url).toString(), [path]);

  const links = [
    {
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
    {
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
    {
      label: "Share on WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard may be unavailable — share links still work.
    }
  }

  return (
    <section aria-label="Share this article" className="rounded-2xl border border-border p-5">
      <h2 className="text-sm font-semibold text-foreground">Share</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-violet-300 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {link.label}
            </a>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-violet-300 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Copy link
          </button>
        </li>
      </ul>
    </section>
  );
}
