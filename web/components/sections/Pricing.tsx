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
          <p className="section-heading">Pricing</p>
          <h2 className="page-title mt-3">
            Simple, transparent plans
          </h2>
          <p className="section-lead">
            Start free with credits. Upgrade when you&apos;re ready—no hidden fees.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "saas-card flex flex-col p-6 sm:p-8",
                plan.highlighted && "relative ring-1 ring-accent/25"
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                  Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-foreground">{plan.price}</span>
                {plan.period && (
                  <span className="text-sm text-muted">{plan.period}</span>
                )}
              </div>
              <p className="mt-3 text-sm leading-[1.7] text-muted">{plan.description}</p>

              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm leading-[1.7]">
                    <Check className="mt-1 shrink-0 text-accent" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>

              <ButtonLink
                href={plan.href}
                variant={plan.highlighted ? "primary" : "secondary"}
                className="mt-8 w-full"
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
