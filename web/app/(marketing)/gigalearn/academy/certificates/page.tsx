import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const AcademyCertificatesRoot = dynamic(
  () =>
    import("@/components/gigalearn/academy/AcademyPageRoots").then((m) => ({
      default: m.AcademyCertificatesRoot,
    })),
  {
    ssr: false,
    loading: () => <ClientAppHydrationNotice productName="GigaLearn Academy" />,
  }
);

export const metadata = publicMetadata({
  path: "/gigalearn/academy/certificates",
  title: "GigaLearn Academy Certificates | Giga3 AI",
  description:
    "View and download GigaLearn Academy certificates issued after server-verified course completion.",
  index: false,
});

export default function GigaLearnAcademyCertificatesPage() {
  return (
    <>
      <ProductSeoHeader
        compact
        title="GigaLearn Academy certificates"
        description="Server-issued certificates with public verification."
        showProductNav={false}
      />
      <div className="marketing-stable gigalearn-stable section-padding pt-4 pb-6 sm:pt-6">
        <Suspense fallback={<ClientAppHydrationNotice productName="GigaLearn Academy" />}>
          <AcademyCertificatesRoot />
        </Suspense>
      </div>
    </>
  );
}
