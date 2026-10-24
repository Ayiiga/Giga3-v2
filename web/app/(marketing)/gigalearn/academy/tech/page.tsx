import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { JsonLd } from "@/components/seo/JsonLd";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const TechHubPractice = dynamic(
  () =>
    import("@/components/gigalearn/academy/TechHubPractice").then((m) => ({
      default: m.TechHubPractice,
    })),
  {
    ssr: false,
    loading: () => <ClientAppHydrationNotice productName="Technology Learning Hub" />,
  }
);

export const metadata = publicMetadata({
  path: "/gigalearn/academy/tech",
  title: "Technology Learning Hub | GigaLearn Academy",
  description:
    "Interactive technology practice for AI, web/PWA, mobile, robotics, and digital technologies inside GigaLearn Academy.",
  index: true,
});

export default function GigaLearnAcademyTechHubPage() {
  return (
    <>
      <JsonLd
        webPage={{
          path: "/gigalearn/academy/tech",
          name: "Technology Learning Hub",
          description:
            "Interactive technology practice for AI, web/PWA, mobile, robotics, and digital technologies inside GigaLearn Academy.",
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaLearn", path: "/gigalearn" },
          { name: "Academy", path: "/gigalearn/academy" },
          { name: "Technology Learning Hub", path: "/gigalearn/academy/tech" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="Technology Learning Hub"
        description="Interactive objective practice for GigaLearn technology courses."
        showProductNav={false}
      />
      <div className="marketing-stable gigalearn-stable section-padding pt-4 pb-6 sm:pt-6">
        <Suspense fallback={<ClientAppHydrationNotice productName="Technology Learning Hub" />}>
          <TechHubPractice />
        </Suspense>
      </div>
    </>
  );
}
