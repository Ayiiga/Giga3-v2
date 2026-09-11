"use client";

import { TREND_CURATED_SECTIONS } from "@/lib/trends/trendDashboard";
import Link from "next/link";

export function TrendDashboardPanel() {
  return (
    <section aria-labelledby="trend-dashboard-heading" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-heading">Curated picks</p>
          <h2 id="trend-dashboard-heading" className="page-title mt-2">
            Where to start on Giga3
          </h2>
          <p className="section-lead mt-2 max-w-2xl">
            These are editorial starting points — not live platform analytics. Live usage rankings
            will appear here when production metrics are wired in.
          </p>
        </div>
      </div>

      <div className="discover-card-grid discover-card-grid--panels">
        {TREND_CURATED_SECTIONS.map((section) => (
          <div key={section.id} className="saas-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
            <p className="mt-1 text-xs text-muted">{section.note}</p>
            <ul className="mt-4 space-y-2">
              {section.links.map((link) => (
                <li key={link.id}>
                  <Link
                    href={link.href}
                    className="block rounded-xl border border-border px-3 py-2.5 text-sm transition hover:border-accent/30"
                  >
                    <span className="font-medium text-foreground">{link.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{link.blurb}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
