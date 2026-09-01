import { LegalDocument } from "@/components/legal/LegalDocument";
import { JsonLd } from "@/components/seo/JsonLd";
import { legalDocumentBySlug } from "@/lib/legal/content";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const document = legalDocumentBySlug["acceptable-use"];

export const metadata = publicMetadata({
  path: `/legal/${document.slug}`,
  title: `${document.title} — Giga3 AI`,
  description: document.description,
});

export default function AcceptableUsePage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Legal", path: "/legal" },
          { name: document.title, path: `/legal/${document.slug}` },
        ]}
      />
      <LegalDocument document={document} />
    </>
  );
}
