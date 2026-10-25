import { Container } from "@/components/ui/Container";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import { AwardsNominateClient } from "@/components/gigasocial/awards/AwardsNominateClient";

export const metadata = publicMetadata({
  path: "/gigasocial/awards/nominate",
  title: "Nominate — GigaSocial Awards",
  description:
    "Apply for yourself or nominate another creator for GigaSocial Awards. Free entry. Consent required before publishing.",
  index: true,
});

export default function AwardsNominatePage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaSocial", path: "/gigasocial" },
          { name: "Awards", path: "/gigasocial/awards" },
          { name: "Nominate", path: "/gigasocial/awards/nominate" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="Nominate or apply"
        description="Free nominations for GigaSocial Awards. Sign in required."
        showProductNav={false}
      />
      <main className="gigasocial-page-shell marketing-stable w-full px-3 pb-10 pt-4 sm:px-6">
        <Container className="!px-0">
          <AwardsNominateClient />
        </Container>
      </main>
    </>
  );
}
