import { AcademyCourseDirectory } from "@/components/seo/AcademyCourseDirectory";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const loading = <p className="text-sm text-muted" role="status">Loading GigaLearn Academy…</p>;

const AcademyHomeRoot = dynamic(
  () =>
    import("@/components/gigalearn/academy/AcademyPageRoots").then((m) => ({
      default: m.AcademyHomeRoot,
    })),
  {
    ssr: false,
    loading: () => loading,
  }
);

export const metadata = publicMetadata({
  path: "/gigalearn/academy",
  title: "GigaLearn Academy — Learn by Doing | Giga3 AI",
  description:
    "Practical AI, Web & PWA, mobile app, robotics, digital skills and teaching courses. Explore ten-lesson outlines and build useful projects with GigaLearn Academy.",
});

export default function GigaLearnAcademyPage() {
  return (
    <>
      <JsonLd
        webPage={{
          path: "/gigalearn/academy",
          name: "GigaLearn Academy",
          description:
            "Practical courses in AI, web and PWA development, mobile apps, robotics, digital skills and teaching.",
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaLearn", path: "/gigalearn" },
          { name: "Academy", path: "/gigalearn/academy" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="GigaLearn Academy"
        description="Learn practical skills in AI, web and PWA development, mobile apps, robotics, digital technology and teaching."
        showProductNav={false}
      />
      <div className="px-3 pt-3 sm:px-6">
        <a
          href="/gigalearn/academy/workspace/"
          className="inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
        >
          Open Academy Workspace
        </a>
      </div>
      <AcademyCourseDirectory />
      <div className="marketing-stable gigalearn-stable px-3 py-3 sm:px-6 sm:py-6">
        <Suspense fallback={loading}>
          <AcademyHomeRoot />
        </Suspense>
      </div>
    </>
  );
}
