import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const AcademyHomeRoot = dynamic(
  () =>
    import("@/components/gigalearn/academy/AcademyPageRoots").then((m) => ({
      default: m.AcademyHomeRoot,
    })),
  {
    ssr: false,
    loading: () => <ClientAppHydrationNotice productName="GigaLearn Academy" />,
  }
);

export const metadata = publicMetadata({
  path: "/gigalearn/academy",
  title: "GigaLearn Academy — Learn by Doing | Giga3 AI",
  description:
    "Learn by Doing. Build with AI. Create the Future. Practice Centre, Learning Studios, and existing GigaLearn Academy pathways — not a separate curriculum rebuild.",
});

export default function GigaLearnAcademyPage() {
  return (
    <>
      <JsonLd
        webPage={{
          path: "/gigalearn/academy",
          name: "GigaLearn Academy",
          description:
            "Practice-oriented GigaLearn Academy hub with Learning Studios, Practice Centre, and existing course pathways.",
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
        description="Learn by Doing. Build with AI. Create the Future. Practice, studios, and existing Academy pathways on GigaLearn."
        showProductNav={false}
      />
      {/* SSR H1 for SEO — client shell repeats branding without a second document h1 conflict via ProductSeoHeader */}
      <h1 className="sr-only">GigaLearn Academy — Learn by Doing. Build with AI. Create the Future.</h1>
      <div className="marketing-stable gigalearn-stable section-padding pt-4 pb-6 sm:pt-6">
        <Suspense fallback={<ClientAppHydrationNotice productName="GigaLearn Academy" />}>
          <AcademyHomeRoot />
        </Suspense>
      </div>
    </>
  );
}
