import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { pricingPlans } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function Pricing() {
  return (
    <section id="pricing" className="section-padding scroll-mt-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-heading text-sm font-medium uppercase tracking-wider text-accent">
            Pricing
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparent plans
          </h2>
          <p className="section-lead">
            Start free with credits. Upgrade when you&apos;re ready—no hidden fees.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "glass flex flex-col rounded-2xl p-8 sm:p-10",
                plan.highlighted &&
                  "relative border-violet-500/50 shadow-xl shadow-violet-500/10 lg:scale-[1.02]"
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-medium text-accent-foreground">
                  Popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className="text-sm text-muted">{plan.period}</span>
                )}
              </div>
              <p className="mt-3 text-sm text-muted">{plan.description}</p>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 shrink-0 text-accent" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>

              <ButtonLink
                href={plan.href}
                variant={plan.highlighted ? "primary" : "secondary"}
                className="mt-10 w-full"
                size="lg"
              >
                {plan.cta}
              </ButtonLink>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
