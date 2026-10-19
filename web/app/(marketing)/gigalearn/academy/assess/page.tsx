import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const AcademyAssessRoot = dynamic(
  () =>
    import("@/components/gigalearn/academy/AcademyPageRoots").then((m) => ({
      default: m.AcademyAssessRoot,
    })),
  {
    ssr: false,
    loading: () => <ClientAppHydrationNotice productName="GigaLearn Academy" />,
  }
);

export const metadata = publicMetadata({
  path: "/gigalearn/academy/assess",
  title: "GigaLearn Academy Assessments | Giga3 AI",
  description:
    "Take enrolled GigaLearn Academy assessments with server-authoritative grading and attempt history.",
  index: false,
});

export default function GigaLearnAcademyAssessPage() {
  return (
    <>
      <ProductSeoHeader
        compact
        title="GigaLearn Academy assessments"
        description="Course quizzes and checkpoints with server-side grading."
        showProductNav={false}
      />
      <div className="marketing-stable gigalearn-stable section-padding pt-4 pb-6 sm:pt-6">
        <Suspense fallback={<ClientAppHydrationNotice productName="GigaLearn Academy" />}>
          <AcademyAssessRoot />
        </Suspense>
      </div>
    </>
  );
}
