import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { Container } from "@/components/ui/Container";
import { JsonLd, type OfferItem } from "@/components/seo/JsonLd";
import {
  buildPublicPlanSummaryLines,
  FREE_STARTER_CREDITS,
  FREE_SIGNUP_HREF,
  SUBSCRIPTION_PLANS,
} from "@/lib/payments/marketingPricing";
import { CREDIT_COSTS } from "@/lib/payments/subscriptionCatalog";
import { MEDIA_VIDEO_CREDIT_TIERS } from "@/lib/media/videoCredits";
import { ButtonLink } from "@/components/ui/Button";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import Link from "next/link";
import dynamic from "next/dynamic";

const PricingPageClient = dynamic(
  () =>
    import("@/components/billing/PricingPageClient").then((m) => ({
      default: m.PricingPageClient,
    })),
  { ssr: false, loading: () => <ClientAppHydrationNotice productName="Paystack checkout" signInHref="/chat/login?next=/pricing" /> }
);

const PAID_PLAN_IDS = ["basic", "pro", "premium"] as const;

export const metadata = publicMetadata({
  path: "/pricing",
  title: "Giga3 AI Pricing — Plans in GHS via Paystack",
  description: `Giga3 AI plans: Free with ${FREE_STARTER_CREDITS} credits, then ${PAID_PLAN_IDS.map(
    (id) => `${SUBSCRIPTION_PLANS[id].label} GHS ${SUBSCRIPTION_PLANS[id].priceGhs}`
  ).join(", ")} per month. Pay in Ghana cedis with Paystack; renews monthly, cancel anytime.`,
});

const PLAN_ROWS = buildPublicPlanSummaryLines().slice(0, 4).map((row) => ({
  name: row.name,
  price: row.price.replace("/month", " / month"),
  credits: row.detail,
  note: row.name === "Free" ? "One-time, no card required" : "Renews automatically · cancel anytime",
}));

const OFFERS: OfferItem[] = [
  {
    name: "Free",
    price: 0,
    priceCurrency: "GHS",
    description: `${FREE_STARTER_CREDITS} starter credits`,
    path: FREE_SIGNUP_HREF,
  },
  ...PAID_PLAN_IDS.map((id) => ({
    name: `${SUBSCRIPTION_PLANS[id].label} (monthly)`,
    price: SUBSCRIPTION_PLANS[id].priceGhs,
    priceCurrency: "GHS",
    description: `${SUBSCRIPTION_PLANS[id].credits} credits per month`,
    path: "/pricing",
  })),
];

export default function PricingPage() {
  return (
    <>
      <JsonLd
        webPage={{
          path: "/pricing",
          name: "Giga3 AI Pricing — Plans in GHS via Paystack",
          description: `Giga3 AI plans: Free with ${FREE_STARTER_CREDITS} credits, then paid monthly plans billed in Ghana cedis through Paystack.`,
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Pricing", path: "/pricing" },
        ]}
      />
      <JsonLd offers={OFFERS} />
      <div className="discover-stable section-padding pt-28 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="hero-title">Pricing</h1>
            <p className="mt-4 text-base leading-[1.7] text-muted">
              Pay in <strong className="text-foreground">Ghana Cedis (GHS)</strong> via
              Paystack. Start free without a payment card, or choose a monthly plan.
            </p>
            <ButtonLink href={FREE_SIGNUP_HREF} className="mt-5">
              Start free with {FREE_STARTER_CREDITS} credits
            </ButtonLink>
          </div>

          <section aria-labelledby="plans-glance" className="mx-auto mt-10 max-w-3xl">
            <h2 id="plans-glance" className="sr-only">
              Plans at a glance
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[30rem] text-left text-sm">
                <caption className="sr-only">Giga3 AI subscription plans and monthly credits</caption>
                <thead className="bg-slate-50 text-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Price</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Credits</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Billing</th>
                  </tr>
                </thead>
                <tbody>
                  {PLAN_ROWS.map((row) => (
                    <tr key={row.name} className="border-t border-border">
                      <th scope="row" className="px-4 py-3 font-medium text-foreground">
                        {row.name}
                      </th>
                      <td className="px-4 py-3 text-foreground">{row.price}</td>
                      <td className="px-4 py-3 text-muted">{row.credits}</td>
                      <td className="px-4 py-3 text-muted">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-center text-xs text-muted">
              Enterprise and education workspaces are priced on request —{" "}
              <Link href="/enterprise/" className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent">
                see Enterprise
              </Link>
              . Video AI has its own{" "}
              <Link href="/video/plans/" className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent">
                video credit plans
              </Link>
              . Cancel automatic renewal any time from your{" "}
              <Link href="/legal/refunds/" className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent">
                wallet (see refund &amp; cancellation policy)
              </Link>
              .
            </p>
          </section>

          <section aria-labelledby="credit-costs" className="mx-auto mt-8 max-w-3xl scroll-mt-28 rounded-2xl border border-border p-5">
            <h2 id="credit-costs" className="text-lg font-semibold text-foreground">
              What uses credits?
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Ordinary text conversations in AI Chat are free. Credits are used for
              premium generation actions; the amount is shown before you confirm.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/10 p-4">
                <p className="font-medium text-foreground">AI image generation</p>
                <p className="mt-1 text-sm text-muted">From {CREDIT_COSTS.image} credits per image</p>
              </div>
              <div className="rounded-xl bg-muted/10 p-4">
                <p className="font-medium text-foreground">Media Studio video examples</p>
                <ul className="mt-1 space-y-1 text-sm text-muted">
                  {MEDIA_VIDEO_CREDIT_TIERS.map(({ durationSec, credits }) => (
                    <li key={durationSec}>{durationSec} seconds · from {credits} credits</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">
              Other tools may have their own usage rules. Always review the displayed
              credit charge before starting a paid task.
            </p>
            <h3 className="mt-5 text-sm font-semibold text-foreground">What happens at renewal?</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Starter credits are a one-time grant. When a paid subscription starts or renews,
              the shared credit balance resets to the plan allowance. Unused credits in that
              balance do not roll over at the reset.
            </p>
          </section>

          <PricingPageClient />
        </Container>
      </div>
    </>
  );
}
