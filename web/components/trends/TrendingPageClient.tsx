"use client";

import { TrendCard } from "@/components/trends/TrendCard";
import { TREND_CATEGORIES, getTrendCategory } from "@/lib/trends/categories";
import { TREND_REGIONS, getTrendRegion, type TrendRegionId } from "@/lib/trends/regions";
import { TrendDashboardPanel } from "@/components/trends/TrendDashboardPanel";
import { DISCOVER_ITEMS } from "@/lib/trends/discoverCatalog";
import { recordTrendActivity } from "@/lib/trends/personalizedRecommendations";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export function TrendingPageClient() {
  const params = useSearchParams();
  const categoryId = params.get("category") ?? "";
  const regionId = (params.get("region") ?? "africa") as TrendRegionId;
  const activeCategory = categoryId ? getTrendCategory(categoryId) : undefined;
  const activeRegion = getTrendRegion(regionId) ?? getTrendRegion("africa");

  const spotlight = useMemo(() => {
    let items = DISCOVER_ITEMS;
    if (activeCategory) {
      items = items.filter((item) => item.category === activeCategory.id);
    }
    if (regionId === "ghana") {
      items = items.filter(
        (item) =>
          /ghana|bece|wassce|accra|africa/i.test(`${item.title} ${item.description}`)
      );
    } else if (regionId !== "global") {
      items = items.filter(
        (item) =>
          /africa|ghana|nigeria|kenya|west/i.test(`${item.title} ${item.description}`) ||
          item.category === "education"
      );
    }
    return items.slice(0, 6);
  }, [activeCategory, regionId]);

  return (
    <div className="space-y-12">
      <header className="mx-auto max-w-3xl text-center">
        <p className="section-heading">Trend Intelligence</p>
        <h2 className="page-title mt-3">Popular topics &amp; curated picks</h2>
        <p className="section-lead mx-auto mt-4">
          Geographic and category filters over curated editorial links — not live engagement
          rankings.
        </p>
      </header>

      <section aria-labelledby="trend-regions-heading">
        <h2 id="trend-regions-heading" className="mb-4 text-lg font-semibold">
          Region
        </h2>
        <div className="flex flex-wrap gap-2">
          {TREND_REGIONS.map((region) => {
            const active = activeRegion?.id === region.id;
            const href = categoryId
              ? `/trending?region=${region.id}&category=${categoryId}`
              : `/trending?region=${region.id}`;
            return (
              <a
                key={region.id}
                href={href}
                className={`min-h-11 rounded-full border px-4 py-2 text-sm ${
                  active
                    ? "border-accent bg-accent/10 font-semibold text-foreground"
                    : "border-border bg-white text-foreground hover:border-accent/30"
                }`}
              >
                {region.label}
              </a>
            );
          })}
        </div>
        {activeRegion ? (
          <p className="mt-2 text-xs text-muted">{activeRegion.description}</p>
        ) : null}
      </section>

      <section aria-labelledby="trend-categories-heading">
        <h2 id="trend-categories-heading" className="mb-4 text-lg font-semibold">
          Popular categories
        </h2>
        <div className="discover-card-grid discover-card-grid--3">
          {TREND_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory?.id === category.id;
            return (
              <TrendCard
                key={category.id}
                title={category.label}
                description={category.description}
                href={category.href}
                icon={<Icon className="h-5 w-5" aria-hidden />}
                className={isActive ? "border-accent bg-accent/5" : undefined}
                onNavigate={() => recordTrendActivity(category.href, category.id)}
              />
            );
          })}
        </div>
      </section>

      <section aria-labelledby="trend-spotlight-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 id="trend-spotlight-heading" className="text-lg font-semibold">
            {activeCategory ? `${activeCategory.label} highlights` : "Featured picks"}
          </h2>
          <a href="/discover" className="text-sm text-accent hover:underline">
            Open Discover →
          </a>
        </div>
        <div className="discover-card-grid">
          {spotlight.map((item) => (
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

      <TrendDashboardPanel />
    </div>
  );
}
