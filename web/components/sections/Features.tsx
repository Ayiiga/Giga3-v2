import { Container } from "@/components/ui/Container";
import { features } from "@/lib/site";
import { cn } from "@/lib/utils";
import {
  Coins,
  CreditCard,
  MessageSquare,
  Shield,
  Smartphone,
  Zap,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<(typeof features)[number]["icon"], LucideIcon> = {
  zap: Zap,
  coins: Coins,
  shield: Shield,
  smartphone: Smartphone,
  messages: MessageSquare,
  "credit-card": CreditCard,
};

export function Features() {
  return (
    <section id="features" className="section-padding scroll-mt-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-accent">
            Features
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to launch AI chat
          </h2>
          <p className="mt-4 text-muted">
            From secure inference to Paystack billing in GHS—Giga3 is built for real
            products, not demos.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = iconMap[feature.icon];
            return (
              <article
                key={feature.title}
                className={cn(
                  "glass group rounded-2xl p-6 transition-all hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5",
                  i === 0 && "sm:col-span-2 lg:col-span-1"
                )}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent transition-colors group-hover:bg-accent/25">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
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
