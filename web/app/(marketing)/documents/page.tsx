import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { JsonLd } from "@/components/seo/JsonLd";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const DocumentsPageRoot = dynamic(
  () =>
    import("@/components/documents/DocumentsPageRoot").then((m) => ({
      default: m.DocumentsPageRoot,
    })),
  {
    ssr: false,
    loading: () => <ClientAppHydrationNotice productName="Document Studio" />,
  }
);

export const metadata = publicMetadata({
  path: "/documents",
  title: "Document Studio — PDF & Word Export | Giga3 AI",
  description:
    "Create and edit CVs, letters, plans and reports in Giga3 Document Studio. Export real PDF and Word files with A4/A5 page setup.",
  index: true,
});

export default function DocumentsPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Document Studio", path: "/documents" },
        ]}
      />
      <ProductSeoHeader
        className="sr-only"
        compact
        title="Document Studio"
        description="Edit, format and export professional documents as PDF or Word."
        showProductNav={false}
      />
      <div className="marketing-stable section-padding pt-3 pb-[calc(var(--primary-nav-offset,0px)+1rem)] sm:pt-5">
        <Suspense fallback={<ClientAppHydrationNotice productName="Document Studio" />}>
          <DocumentsPageRoot />
        </Suspense>
      </div>
    </>
  );
}
