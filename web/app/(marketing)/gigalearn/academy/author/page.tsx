import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const AcademyAuthorRoot = dynamic(
  () =>
    import("@/components/gigalearn/academy/AcademyPageRoots").then((m) => ({
      default: m.AcademyAuthorRoot,
    })),
  {
    ssr: false,
    loading: () => <ClientAppHydrationNotice productName="GigaLearn Academy" />,
  }
);

export const metadata = publicMetadata({
  path: "/gigalearn/academy/author",
  title: "GigaLearn Academy Authoring | Giga3 AI",
  description: "Authorized authoring foundation for structured GigaLearn Academy courses.",
  index: false,
});

export default function GigaLearnAcademyAuthorPage() {
  return (
    <>
      <ProductSeoHeader
        compact
        title="Academy authoring"
        description="Create structured courses without replacing existing GigaLearn content."
        showProductNav={false}
      />
      <div className="marketing-stable gigalearn-stable section-padding pt-4 pb-6 sm:pt-6">
        <Suspense fallback={<ClientAppHydrationNotice productName="GigaLearn Academy" />}>
          <AcademyAuthorRoot />
        </Suspense>
      </div>
    </>
  );
}
