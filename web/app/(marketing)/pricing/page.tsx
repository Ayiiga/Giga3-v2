import { Container } from "@/components/ui/Container";
import { JsonLd, type OfferItem } from "@/components/seo/JsonLd";
import {
  FREE_STARTER_CREDITS,
  SUBSCRIPTION_PLANS,
} from "@/lib/payments/subscriptionCatalog";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import Link from "next/link";
import dynamic from "next/dynamic";

const PricingPageClient = dynamic(
  () =>
    import("@/components/billing/PricingPageClient").then((m) => ({
      default: m.PricingPageClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

const PAID_PLAN_IDS = ["basic", "pro", "premium"] as const;

export const metadata = publicMetadata({
  path: "/pricing",
  title: "Giga3 AI Pricing — Plans in GHS via Paystack",
  description: `Giga3 AI plans: Free with ${FREE_STARTER_CREDITS} credits, then ${PAID_PLAN_IDS.map(
    (id) => `${SUBSCRIPTION_PLANS[id].label} GHS ${SUBSCRIPTION_PLANS[id].priceGhs}`
  ).join(", ")} per month. Pay in Ghana cedis with Paystack; renews monthly, cancel anytime.`,
});

const PLAN_ROWS = [
  {
    name: "Free",
    price: "GHS 0",
    credits: `${FREE_STARTER_CREDITS} starter credits`,
    note: "One-time, no card required",
  },
  ...PAID_PLAN_IDS.map((id) => ({
    name: SUBSCRIPTION_PLANS[id].label,
    price: `GHS ${SUBSCRIPTION_PLANS[id].priceGhs} / month`,
    credits: `${SUBSCRIPTION_PLANS[id].credits} credits / month`,
    note: "Renews automatically · cancel anytime",
  })),
];

const OFFERS: OfferItem[] = [
  {
    name: "Free",
    price: 0,
    priceCurrency: "GHS",
    description: `${FREE_STARTER_CREDITS} starter credits`,
    path: "/chat/login",
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
              Paystack. Subscription credits refill every billing period.
            </p>
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

          <PricingPageClient />
        </Container>
      </div>
    </>
  );
}
