import { Container } from "@/components/ui/Container";
import { TrendCard } from "@/components/trends/TrendCard";
import { TREND_CATEGORIES } from "@/lib/trends/categories";
import { DISCOVER_ITEMS } from "@/lib/trends/discoverCatalog";
import { siteConfig } from "@/lib/site";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowRight, Compass, Flame, Library, Sparkles } from "lucide-react";
import Link from "next/link";

const QUICK_SHORTCUTS = [
  { label: "AI Chat", href: siteConfig.links.dashboard, icon: Sparkles },
  { label: "GigaLearn", href: siteConfig.links.gigalearn, icon: Library },
  { label: "Creator Studio", href: siteConfig.links.creatorStudio, icon: Flame },
  { label: "Discover", href: "/discover", icon: Compass },
] as const;

export function TrendIntelligenceSection() {
  const featured = DISCOVER_ITEMS.filter((item) => item.badge).slice(0, 3);
  const topics = TREND_CATEGORIES.slice(0, 6);

  return (
    <section id="trending" className="discover-stable section-padding scroll-mt-24 bg-zinc-50">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-heading">Trend intelligence</p>
          <h2 className="page-title mt-3">What people are exploring on Giga3</h2>
          <p className="section-lead">
            Trending topics, curated prompts, creator tools, and learning resources — built for
            students, teachers, creators, and professionals.
          </p>
        </div>

        <div className="discover-card-grid discover-card-grid--4 mt-10">
          {QUICK_SHORTCUTS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="saas-card flex items-center gap-3 rounded-2xl px-4 py-3 hover:border-accent/30"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">Trending topics</h3>
            <Link href="/trending" className="text-sm text-accent hover:underline">
              View all →
            </Link>
          </div>
          <div className="discover-card-grid discover-card-grid--3">
            {topics.map((category) => {
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
        </div>

        <div className="mt-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">Featured picks</h3>
            <Link href="/discover" className="text-sm text-accent hover:underline">
              Open Discover →
            </Link>
          </div>
          <div className="discover-card-grid discover-card-grid--3">
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
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/prompts" variant="primary" size="lg">
            Browse prompt library
            <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
          <ButtonLink href="/trending" variant="outline" size="lg">
            Trending hub
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
