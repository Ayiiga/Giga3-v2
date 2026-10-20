import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const AcademyCatalogueRoot = dynamic(
  () =>
    import("@/components/gigalearn/academy/AcademyPageRoots").then((m) => ({
      default: m.AcademyCatalogueRoot,
    })),
  {
    ssr: false,
    loading: () => <ClientAppHydrationNotice productName="GigaLearn Academy" />,
  }
);

export const metadata = publicMetadata({
  path: "/gigalearn/academy/courses",
  title: "GigaLearn Academy Course Catalogue | Giga3 AI",
  description:
    "Browse GigaLearn Academy courses: BECE and WASSCE pathways, early years Discover media, and teacher studio tracks that reuse existing GigaLearn tools.",
});

export default function GigaLearnAcademyCoursesPage() {
  return (
    <>
      <JsonLd
        webPage={{
          path: "/gigalearn/academy/courses",
          name: "GigaLearn Academy Course Catalogue",
          description:
            "Structured course catalogue and learning pathways on GigaLearn Academy.",
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaLearn", path: "/gigalearn" },
          { name: "Academy", path: "/gigalearn/academy" },
          { name: "Courses", path: "/gigalearn/academy/courses" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="Academy course catalogue"
        description="Structured courses and pathways that build on GigaLearn hubs."
        showProductNav={false}
      />
      <div className="marketing-stable gigalearn-stable section-padding pt-4 pb-6 sm:pt-6">
        <Suspense fallback={<ClientAppHydrationNotice productName="GigaLearn Academy" />}>
          <AcademyCatalogueRoot />
        </Suspense>
      </div>
    </>
  );
}
