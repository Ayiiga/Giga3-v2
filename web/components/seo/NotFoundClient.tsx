"use client";

import { StableLink } from "@/components/ui/StableLink";
import { PRODUCT_CATALOG } from "@/lib/seo/productCatalog";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const POPULAR = PRODUCT_CATALOG.filter((p) =>
  ["/chat", "/gigalearn", "/media", "/gigasocial"].includes(p.href)
);

const buttonBase =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

export function NotFoundClient() {
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const path = window.location.pathname + window.location.search;
    try {
      void fetch("/api/log-404", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, ref: document.referrer || "" }),
        keepalive: true,
        cache: "no-store",
      });
    } catch {
      /* ignore */
    }
  }, []);

  async function nuclearReset() {
    setResetting(true);
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
    window.location.replace("/");
  }

  return (
    <>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <StableLink
          href="/"
          hard
          className={cn(
            buttonBase,
            "bg-accent text-accent-foreground shadow-sm hover:bg-accent/90"
          )}
        >
          Go to home page
        </StableLink>
        <button
          type="button"
          disabled={resetting}
          onClick={() => void nuclearReset()}
          className={cn(
            buttonBase,
            "border border-zinc-200 bg-white text-foreground shadow-sm hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60"
          )}
        >
          {resetting ? "Resetting…" : "Browse all features"}
        </button>
      </div>
      <nav aria-label="Popular destinations" className="mt-12 text-left">
        <h2 className="text-sm font-semibold text-foreground">Popular destinations</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {POPULAR.map((p) => (
            <li key={p.href}>
              <StableLink
                href={p.href}
                hard
                className="block rounded-xl border border-border px-4 py-3 text-sm hover:border-violet-300"
              >
                <span className="font-medium text-foreground">{p.name}</span>
                <span className="block text-xs text-muted">{p.tagline}</span>
              </StableLink>
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-6 text-center text-[11px] text-muted">
        &quot;Browse all features&quot; clears cached app files and reloads fresh.
      </p>
    </>
  );
}
