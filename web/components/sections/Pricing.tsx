import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { CREDIT_COSTS } from "@/lib/payments/subscriptionCatalog";
import { MEDIA_VIDEO_CREDIT_TIERS } from "@/lib/media/videoCredits";
import { pricingPlans } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function Pricing() {
  return (
    <section id="pricing" className="discover-stable section-padding scroll-mt-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-heading">Pricing</p>
          <h2 className="page-title mt-3">
            Start free. Upgrade when you need more.
          </h2>
          <p className="section-lead">
            Ordinary text chat is free. Premium tools use credits. An AI image starts at{" "}
            {CREDIT_COSTS.image} credits and a {MEDIA_VIDEO_CREDIT_TIERS[0].durationSec}-second
            Media Studio video starts at {MEDIA_VIDEO_CREDIT_TIERS[0].credits} credits.
          </p>
          <p className="mt-3 text-sm text-muted">
            Paid plans renew monthly in Ghana cedis through Paystack.{" "}
            <a href="/pricing/#credit-costs" className="font-medium text-accent underline underline-offset-2">
              See credit costs and renewal rules
            </a>
          </p>
        </div>

        <div className="discover-card-grid discover-card-grid--4 mt-14">
          {pricingPlans.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "saas-card flex flex-col p-6 sm:p-8",
                plan.highlighted && "relative ring-1 ring-accent/25"
              )}
            >
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
