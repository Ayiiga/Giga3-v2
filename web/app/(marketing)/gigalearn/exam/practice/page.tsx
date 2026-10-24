import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const ExamPracticeSessionRoot = dynamic(
  () =>
    import("@/components/gigalearn/exam/ExamPracticeSessionRoot").then((m) => ({
      default: m.ExamPracticeSessionRoot,
    })),
  {
    ssr: false,
    loading: () => <ClientAppHydrationNotice productName="GigaLearn Exam Practice" />,
  }
);

export const metadata = publicMetadata({
  path: "/gigalearn/exam/practice",
  // Keep ≤70 chars including the "| Giga3 AI" suffix from publicMetadata.
  title: "Teacher Promotion Practice | Giga3 AI",
  description:
    "Timed general 50-question Teacher Promotion orientation practice on GigaLearn — no specific promotion rank. Not an official GES examination paper.",
});

export default function ExamPracticeSessionPage() {
  return (
    <>
      <JsonLd
        webPage={{
          path: "/gigalearn/exam/practice",
          name: "General Teacher Promotion Practice",
          description:
            "Mobile-first timed general Teacher Promotion orientation practice on GigaLearn. No specific promotion rank selected.",
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaLearn", path: "/gigalearn" },
          { name: "Exam Practice", path: "/gigalearn/exam" },
          {
            name: "General Teacher Promotion Practice",
            path: "/gigalearn/exam/practice",
          },
        ]}
      />
      <ProductSeoHeader
        compact
        title="Welcome to General Teacher Promotion Practice"
        description="General practice — no specific promotion rank selected. Timed orientation practice — not an official GES paper."
        showProductNav={false}
      />
      <div className="marketing-stable gigalearn-stable section-padding pt-2 pb-4 sm:pt-4">
        <Suspense fallback={<ClientAppHydrationNotice productName="GigaLearn Exam Practice" />}>
          <ExamPracticeSessionRoot />
        </Suspense>
      </div>
    </>
  );
}
