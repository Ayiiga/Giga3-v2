import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const AcademyMyCoursesRoot = dynamic(
  () =>
    import("@/components/gigalearn/academy/AcademyPageRoots").then((m) => ({
      default: m.AcademyMyCoursesRoot,
    })),
  {
    ssr: false,
    loading: () => <ClientAppHydrationNotice productName="GigaLearn Academy" />,
  }
);

export const metadata = publicMetadata({
  path: "/gigalearn/academy/my",
  title: "My GigaLearn Academy Courses | Giga3 AI",
  description: "Your server-verified GigaLearn Academy enrolments and pathway progress.",
  index: false,
});

export default function GigaLearnAcademyMyPage() {
  return (
    <>
      <ProductSeoHeader
        compact
        title="My Academy courses"
        description="Enrolled pathways on GigaLearn Academy."
        showProductNav={false}
      />
      <div className="marketing-stable gigalearn-stable section-padding pt-4 pb-6 sm:pt-6">
        <Suspense fallback={<ClientAppHydrationNotice productName="GigaLearn Academy" />}>
          <AcademyMyCoursesRoot />
        </Suspense>
      </div>
    </>
  );
}
