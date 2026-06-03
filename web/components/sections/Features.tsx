import { Container } from "@/components/ui/Container";
import { features } from "@/lib/site";
import { cn } from "@/lib/utils";
import {
  Coins,
  Layers,
  MessageSquare,
  Shield,
  Smartphone,
  Zap,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<(typeof features)[number]["icon"], LucideIcon> = {
  layers: Layers,
  messages: MessageSquare,
  zap: Zap,
  coins: Coins,
  shield: Shield,
  smartphone: Smartphone,
};

export function Features() {
  return (
    <section id="features" className="section-padding scroll-mt-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-heading text-sm font-medium uppercase tracking-wider text-accent">
            Features
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to launch AI chat
          </h2>
          <p className="section-lead">
            Multi-conversation chat, provider failover, Paystack billing in GHS—built
            for production on Convex and Cloudflare.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = iconMap[feature.icon];
            return (
              <article
                key={feature.title}
                className={cn(
                  "glass group rounded-2xl p-8 transition-all hover:-translate-y-0.5 hover:border-violet-500/35 hover:shadow-lg hover:shadow-violet-500/10",
                  i === 0 && "ring-1 ring-violet-500/20 sm:col-span-2 lg:col-span-1"
                )}
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/15 text-accent transition-colors group-hover:bg-accent/25">
                  <Icon aria-hidden />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
