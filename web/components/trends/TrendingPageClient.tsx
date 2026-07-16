"use client";

import { TrendCard } from "@/components/trends/TrendCard";
import { TREND_CATEGORIES, getTrendCategory } from "@/lib/trends/categories";
import { TrendDashboardPanel } from "@/components/trends/TrendDashboardPanel";
import { DISCOVER_ITEMS } from "@/lib/trends/discoverCatalog";
import { recordTrendActivity } from "@/lib/trends/personalizedRecommendations";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export function TrendingPageClient() {
  const params = useSearchParams();
  const categoryId = params.get("category") ?? "";
  const activeCategory = categoryId ? getTrendCategory(categoryId) : undefined;

  const spotlight = useMemo(() => {
    if (!activeCategory) return DISCOVER_ITEMS.slice(0, 6);
    return DISCOVER_ITEMS.filter((item) => item.category === activeCategory.id).slice(0, 6);
  }, [activeCategory]);

  return (
    <div className="space-y-12">
      <header className="mx-auto max-w-3xl text-center">
        <p className="section-heading">Trend Intelligence</p>
        <h1 className="page-title mt-3">Trending on Giga3 AI</h1>
        <p className="section-lead mx-auto mt-4">
          Explore what students, creators, and professionals are searching for — from AI and coding
          to education, business, and the creator economy.
        </p>
      </header>

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
            {activeCategory ? `${activeCategory.label} highlights` : "Featured right now"}
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
