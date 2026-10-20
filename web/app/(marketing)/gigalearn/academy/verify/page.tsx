import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const AcademyVerifyRoot = dynamic(
  () =>
    import("@/components/gigalearn/academy/AcademyPageRoots").then((m) => ({
      default: m.AcademyVerifyRoot,
    })),
  {
    ssr: false,
    loading: () => <ClientAppHydrationNotice productName="GigaLearn Academy" />,
  }
);

export const metadata = publicMetadata({
  path: "/gigalearn/academy/verify",
  title: "Verify GigaLearn Academy Certificate | Giga3 AI",
  description:
    "Confirm whether a GigaLearn Academy certificate is authentic, valid, or revoked. Minimal personal information is shown.",
  index: true,
});

export default function GigaLearnAcademyVerifyPage() {
  return (
    <>
      <ProductSeoHeader
        compact
        title="Verify GigaLearn Academy certificate"
        description="Check authenticity and validity with a certificate ID."
        showProductNav={false}
      />
      <div className="marketing-stable gigalearn-stable section-padding pt-4 pb-6 sm:pt-6">
        <Suspense fallback={<ClientAppHydrationNotice productName="GigaLearn Academy" />}>
          <AcademyVerifyRoot />
        </Suspense>
      </div>
    </>
  );
}
