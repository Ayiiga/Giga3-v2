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
          <AwardsHubClient />
        </Container>
      </main>
    </>
  );
}
