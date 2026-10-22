import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const PromotionRankSelector = dynamic(
  () =>
    import("@/components/gigalearn/exam/PromotionRankSelector").then((m) => ({
      default: m.PromotionRankSelector,
    })),
  {
    ssr: false,
    loading: () => <ClientAppHydrationNotice productName="Teacher Promotion ranks" />,
  }
);

export const metadata = publicMetadata({
  path: "/gigalearn/exam/promotion",
  title: "Teacher Promotion Rank Practice | GigaLearn",
  description:
    "Choose your GES Teacher Promotion rank — AD II, AD I, Deputy Director, Director II, or Director I — and start free learn-mode practice on GigaLearn.",
});

export default function TeacherPromotionRankSelectPage() {
  return (
    <>
      <JsonLd
        webPage={{
          path: "/gigalearn/exam/promotion",
          name: "Teacher Promotion Rank Practice",
          description:
            "Five-rank free practice selector for Ghana Teacher Promotion preparation on GigaLearn.",
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaLearn", path: "/gigalearn" },
          { name: "Exam Practice", path: "/gigalearn/exam" },
          { name: "Teacher Promotion ranks", path: "/gigalearn/exam/promotion" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="Teacher Promotion Rank Practice"
        description="Select your promotion rank and start free practice with explanations."
        showProductNav={false}
      />
      <div className="marketing-stable gigalearn-stable section-padding pt-4 pb-6 sm:pt-6">
        <Suspense fallback={<ClientAppHydrationNotice productName="Teacher Promotion ranks" />}>
          <PromotionRankSelector />
        </Suspense>
      </div>
    </>
  );
}
