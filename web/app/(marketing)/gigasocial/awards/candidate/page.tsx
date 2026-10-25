import { Container } from "@/components/ui/Container";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import { AwardsCandidateClient } from "@/components/gigasocial/awards/AwardsCandidateClient";

export const metadata = publicMetadata({
  path: "/gigasocial/awards/candidate",
  title: "Candidate — GigaSocial Awards",
  description:
    "View a GigaSocial Awards candidate profile and cast a free vote when voting is open. Tips never buy votes.",
  index: false,
});

export default function AwardsCandidatePage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaSocial", path: "/gigasocial" },
          { name: "Awards", path: "/gigasocial/awards" },
          { name: "Candidate", path: "/gigasocial/awards/candidate" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="Award candidate"
        description="Shareable candidate profile and free voting when the season is open."
        showProductNav={false}
      />
      <main className="gigasocial-page-shell marketing-stable w-full px-3 pb-10 pt-4 sm:px-6">
        <Container className="!px-0">
          <AwardsCandidateClient />
        </Container>
      </main>
    </>
  );
}
