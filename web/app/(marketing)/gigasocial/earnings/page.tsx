import { Container } from "@/components/ui/Container";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata = publicMetadata({
  path: "/gigasocial/earnings",
  title: "Creator Earnings Centre — GigaSocial",
  description:
    "GigaSocial Creator Earnings Centre: eligibility, verified GH₵ earnings, rewards, awards, and the annual goal planner. Sign in to open your dashboard.",
  index: true,
});

export default function GigaSocialEarningsPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaSocial", path: "/gigasocial" },
          { name: "Creator Earnings", path: "/gigasocial/earnings" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="Creator Earnings Centre"
        description="Transparent GH₵ earnings, eligibility at 500 fans, rewards, and awards. Sign in to open your live dashboard."
        showProductNav={false}
      />
      <main className="gigasocial-page-shell marketing-stable w-full px-3 pb-10 pt-4 sm:px-6">
        <Container className="!px-0">
          <p className="mt-1 max-w-2xl text-sm text-muted sm:text-base">
            Eligible creators can review monetisation status, verified earnings, reward catalogues,
            and an optional GH₵100,000 annual goal planner. Figures are never invented. Advertising
            revenue share and unfunded cash prizes stay unavailable until real programmes launch.
          </p>
          <ul className="mt-6 max-w-xl list-disc space-y-2 pl-5 text-sm text-foreground">
            <li>500 genuine fans required before applying for monetisation</li>
            <li>Verified tips and Marketplace sales only in withdrawable balance</li>
            <li>Payouts stay pending until Paystack Transfer confirmation is available</li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/gigasocial/?tab=creator&creatorTab=earnings" className="min-h-11">
              Open Earnings Centre
            </ButtonLink>
            <ButtonLink href="/gigasocial/?tab=creator" variant="outline" className="min-h-11">
              Creator tools
            </ButtonLink>
          </div>
        </Container>
      </main>
    </>
  );
}
