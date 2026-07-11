"use client";

import { TrendCard } from "@/components/trends/TrendCard";
import {
  DISCOVER_ITEMS,
  type DiscoverItemKind,
} from "@/lib/trends/discoverCatalog";
import { getLocalPersonalizedRecommendations } from "@/lib/trends/personalizedRecommendations";
import { recordTrendActivity } from "@/lib/trends/personalizedRecommendations";
import { TREND_CATEGORIES } from "@/lib/trends/categories";
import { useMemo, useState } from "react";

const KIND_FILTERS: { id: DiscoverItemKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "prompt", label: "Prompts" },
  { id: "education", label: "Education" },
  { id: "creator-tool", label: "Creator tools" },
  { id: "study", label: "Study" },
  { id: "marketplace", label: "Marketplace" },
  { id: "community", label: "Communities" },
];

export function DiscoverPageClient() {
  const [kindFilter, setKindFilter] = useState<DiscoverItemKind | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const personalized = useMemo(() => getLocalPersonalizedRecommendations(4), []);

  const items = useMemo(() => {
    return DISCOVER_ITEMS.filter((item) => {
      if (kindFilter !== "all" && item.kind !== kindFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      return true;
    });
  }, [categoryFilter, kindFilter]);

  return (
    <div className="space-y-10">
      <header className="mx-auto max-w-3xl text-center">
        <p className="section-heading">Discover</p>
        <h1 className="page-title mt-3">Explore Giga3 AI</h1>
        <p className="section-lead mx-auto mt-4">
          Popular prompts, learning resources, creator tools, marketplace picks, and communities —
          curated for how people actually search.
        </p>
      </header>

      <section aria-labelledby="discover-for-you">
        <h2 id="discover-for-you" className="mb-3 text-lg font-semibold">
          Recommended for you
        </h2>
        <p className="mb-4 text-sm text-muted">
          Based on your device activity only — we never expose private account data here.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {personalized.map((item) => (
            <TrendCard
              key={item.id}
              title={item.title}
              description={item.description}
              href={item.href}
              meta={item.reason}
              onNavigate={() => recordTrendActivity(item.href)}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="discover-filters">
        <h2 id="discover-filters" className="sr-only">
          Filters
        </h2>
        <div className="flex flex-wrap gap-2">
          {KIND_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setKindFilter(filter.id)}
              className={
                kindFilter === filter.id
                  ? "rounded-full border border-accent bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent"
                  : "rounded-full border border-border px-4 py-1.5 text-sm text-muted hover:border-accent/30"
              }
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={
              categoryFilter === "all"
                ? "rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs text-accent"
                : "rounded-full border border-border px-3 py-1 text-xs text-muted"
            }
          >
            All topics
          </button>
          {TREND_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={
                categoryFilter === cat.id
                  ? "rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs text-accent"
                  : "rounded-full border border-border px-3 py-1 text-xs text-muted"
              }
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="discover-grid">
        <h2 id="discover-grid" className="mb-4 text-lg font-semibold">
          Browse everything
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <TrendCard
              key={item.id}
              title={item.title}
              description={item.description}
              href={item.href}
              badge={item.badge}
              onNavigate={() => recordTrendActivity(item.href, item.category)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
