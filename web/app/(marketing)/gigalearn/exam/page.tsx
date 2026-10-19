import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const ExamPracticePageRoot = dynamic(
  () =>
    import("@/components/gigalearn/exam/ExamPracticePageRoot").then((m) => ({
      default: m.ExamPracticePageRoot,
    })),
  {
    ssr: false,
    loading: () => <ClientAppHydrationNotice productName="GigaLearn Exam Practice" />,
  }
);

export const metadata = publicMetadata({
  path: "/gigalearn/exam",
  title: "GigaLearn Exam Practice Centre | Giga3 AI",
  description:
    "Practise smarter for BECE and Ghana Teacher Promotion on GigaLearn. Honest awaiting-sources states; verified materials only when available.",
});

export default function GigaLearnExamPracticePage() {
  return (
    <>
      <JsonLd
        webPage={{
          path: "/gigalearn/exam",
          name: "GigaLearn Exam Practice Centre",
          description:
            "Mobile-first exam practice hub with BECE and Ghana Teacher Promotion centres. No fabricated question banks.",
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaLearn", path: "/gigalearn" },
          { name: "Exam Practice", path: "/gigalearn/exam" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="GigaLearn Exam Practice Centre"
        description="Practise smarter. Understand your mistakes. Prepare with confidence."
        showProductNav={false}
      />
      <div className="marketing-stable gigalearn-stable section-padding pt-4 pb-6 sm:pt-6">
        <Suspense fallback={<ClientAppHydrationNotice productName="GigaLearn Exam Practice" />}>
          <ExamPracticePageRoot />
        </Suspense>
      </div>
    </>
  );
}
