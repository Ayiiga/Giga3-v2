"use client";

import { TrendCard } from "@/components/trends/TrendCard";
import { TREND_DASHBOARD_SECTIONS } from "@/lib/trends/trendDashboard";
import Link from "next/link";

export function TrendDashboardPanel() {
  return (
    <section aria-labelledby="trend-dashboard-heading" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-heading">Platform pulse</p>
          <h2 id="trend-dashboard-heading" className="page-title mt-2">
            Trending dashboard
          </h2>
          <p className="section-lead mt-2 max-w-2xl">
            Modular metrics ready for live analytics — updated from curated platform signals today.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {TREND_DASHBOARD_SECTIONS.map((section) => (
          <div key={section.id} className="saas-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
            <ul className="mt-4 space-y-2">
              {section.metrics.map((metric) => (
                <li key={metric.id}>
                  {metric.href ? (
                    <Link
                      href={metric.href}
                      className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm hover:border-accent/30"
                    >
                      <span className="font-medium">{metric.label}</span>
                      <span className="text-accent">
                        {metric.value}
                        {metric.change ? (
                          <span className="ml-1 text-xs text-muted">{metric.change}</span>
                        ) : null}
                      </span>
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm">
                      <span className="font-medium">{metric.label}</span>
                      <span className="text-accent">{metric.value}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
