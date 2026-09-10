import { TrendCard } from "@/components/trends/TrendCard";
import { TREND_CATEGORIES } from "@/lib/trends/categories";
import { DISCOVER_ITEMS } from "@/lib/trends/discoverCatalog";
import Link from "next/link";

/** SSR-safe trending shell — categories and spotlight before client hydration. */
export function TrendingStaticShell() {
  const spotlight = DISCOVER_ITEMS.slice(0, 6);

  return (
    <div className="space-y-10">
      <section aria-labelledby="trending-static-categories">
        <h2 id="trending-static-categories" className="mb-4 text-lg font-semibold">
          Popular categories
        </h2>
        <div className="discover-card-grid discover-card-grid--3">
          {TREND_CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <TrendCard
                key={category.id}
                title={category.label}
                description={category.description}
                href={category.href}
                icon={<Icon className="h-5 w-5" aria-hidden />}
              />
            );
          })}
        </div>
      </section>

      <section aria-labelledby="trending-static-spotlight">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 id="trending-static-spotlight" className="text-lg font-semibold">
            Featured picks
          </h2>
          <Link href="/discover" className="text-sm text-accent hover:underline">
            Open Discover →
          </Link>
        </div>
        <div className="discover-card-grid">
          {spotlight.map((item) => (
            <TrendCard
              key={item.id}
              title={item.title}
              description={item.description}
              href={item.href}
              badge={item.badge}
            />
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">
          Category filters and activity tracking load with the app — no fake live metrics are shown
          here.
        </p>
      </section>
    </div>
  );
}
