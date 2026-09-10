import { TrendCard } from "@/components/trends/TrendCard";
import { TREND_CATEGORIES } from "@/lib/trends/categories";
import { DISCOVER_ITEMS } from "@/lib/trends/discoverCatalog";
import Link from "next/link";

/** SSR-safe discover grid — visible before client hydration. */
export function DiscoverStaticShell() {
  const featured = DISCOVER_ITEMS.slice(0, 8);

  return (
    <div className="space-y-10">
      <section aria-labelledby="discover-static-featured">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 id="discover-static-featured" className="text-lg font-semibold">
            Curated picks
          </h2>
          <span className="text-sm text-muted">Static discovery — filters load with the app</span>
        </div>
        <div className="discover-card-grid">
          {featured.map((item) => (
            <TrendCard
              key={item.id}
              title={item.title}
              description={item.description}
              href={item.href}
              badge={item.badge}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="discover-static-categories">
        <h2 id="discover-static-categories" className="mb-4 text-lg font-semibold">
          Browse by topic
        </h2>
        <div className="discover-card-grid discover-card-grid--3">
          {TREND_CATEGORIES.slice(0, 6).map((category) => {
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
        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/trending" className="text-accent hover:underline">
            View trending topics →
          </Link>
        </p>
      </section>
    </div>
  );
}
