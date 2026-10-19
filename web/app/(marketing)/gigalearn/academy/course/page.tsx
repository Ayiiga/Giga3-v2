import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const AcademyCourseRoot = dynamic(
  () =>
    import("@/components/gigalearn/academy/AcademyPageRoots").then((m) => ({
      default: m.AcademyCourseRoot,
    })),
  {
    ssr: false,
    loading: () => <ClientAppHydrationNotice productName="GigaLearn Academy" />,
  }
);

export const metadata = publicMetadata({
  path: "/gigalearn/academy/course",
  title: "GigaLearn Academy Course | Giga3 AI",
  description:
    "Course overview, learning pathway, and enrolment for GigaLearn Academy. Select a course from the catalogue.",
  index: false,
});

export default function GigaLearnAcademyCoursePage() {
  return (
    <>
      <ProductSeoHeader
        compact
        title="GigaLearn Academy course"
        description="Structured pathway details and server-verified enrolment."
        showProductNav={false}
      />
      <div className="marketing-stable gigalearn-stable section-padding pt-4 pb-6 sm:pt-6">
        <Suspense fallback={<ClientAppHydrationNotice productName="GigaLearn Academy" />}>
          <AcademyCourseRoot />
        </Suspense>
      </div>
    </>
  );
}
