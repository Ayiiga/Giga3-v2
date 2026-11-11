import { Container } from "@/components/ui/Container";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import { AwardsHubClient } from "@/components/gigasocial/awards/AwardsHubClient";

export const metadata = publicMetadata({
  path: "/gigasocial/awards",
  title: "GigaSocial Awards — Creator recognition for Ghana & Africa",
  description:
    "GigaSocial Awards: free nominations, free fraud-resistant voting, optional promotional packages, and sponsor-funded prizes. Operated by Giga3 AI.",
  index: true,
});

export default function GigaSocialAwardsPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaSocial", path: "/gigasocial" },
          { name: "Awards", path: "/gigasocial/awards" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="GigaSocial Awards"
        description="Recognise creators across Ghana — free to enter, free to vote. Packages never buy votes."
        showProductNav={false}
      />
      <main className="gigasocial-page-shell marketing-stable w-full px-3 pb-10 pt-4 sm:px-6">
        <Container className="!px-0">
          <section
            id="december-2026"
            aria-labelledby="december-awards-title"
            className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-5 text-violet-950 sm:p-7"
          >
            <h2 id="december-awards-title" className="text-xl font-bold sm:text-2xl">
              GigaSocial Awards — December 2026 Creator Edition
            </h2>
            <p className="mt-2">
              We’re preparing a December edition to recognise creators in Ghana. If you create
              original content, start choosing the posts that best show your work.
            </p>
            <p className="mt-2">
              December nominations and voting are pending. Dates and participation rules will be
              posted here when confirmed.
            </p>
            <a
              href="/contact/"
              className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-violet-700 px-4 font-semibold text-white hover:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-800"
            >
              Ask about December sponsorship
            </a>
          </section>
          <AwardsHubClient />
        </Container>
      </main>
    </>
  );
}
