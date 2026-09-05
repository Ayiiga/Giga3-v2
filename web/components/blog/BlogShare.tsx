"use client";

import { siteConfig } from "@/lib/site";
import { shareText } from "@/lib/share/clientShare";
import { useMemo, useState } from "react";

type BlogShareProps = {
  title: string;
  path: string;
};

export function BlogShare({ title, path }: BlogShareProps) {
  const url = useMemo(
    () => new URL(path.endsWith("/") ? path : `${path}/`, siteConfig.url).toString(),
    [path]
  );
  const [copied, setCopied] = useState(false);

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
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable — share links still work.
    }
  }

  async function shareArticle() {
    const result = await shareText({ title, text: title, url });
    if (result.ok) return;
    await copyLink();
  }

  return (
    <section aria-label="Share this article" className="rounded-2xl border border-border p-5">
      <h2 className="text-sm font-semibold text-foreground">Share</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        <li>
          <button
            type="button"
            onClick={() => void shareArticle()}
            className="inline-flex rounded-full border border-accent bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent transition hover:bg-accent/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Share article
          </button>
        </li>
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
            onClick={() => void copyLink()}
            className="inline-flex rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-violet-300 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {copied ? "Link copied" : "Copy link"}
          </button>
        </li>
      </ul>
    </section>
  );
}
