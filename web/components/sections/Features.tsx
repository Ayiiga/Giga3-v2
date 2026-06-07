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
          <p className="section-heading">Features</p>
          <h2 className="page-title mt-3">
            Everything you need to launch AI chat
          </h2>
          <p className="section-lead">
            Multi-conversation chat, provider failover, Paystack billing in GHS—built
            for production on Convex and Cloudflare.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = iconMap[feature.icon];
            return (
              <article
                key={feature.title}
                className={cn(
                  "saas-card p-6 sm:p-8",
                  i === 0 && "ring-1 ring-accent/10 sm:col-span-2 lg:col-span-1"
                )}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 leading-[1.7] text-muted">
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
