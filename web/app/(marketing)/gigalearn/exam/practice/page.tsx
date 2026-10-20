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
  title: "Teacher Promotion Free Practice | GigaLearn Exam Practice",
  description:
    "Timed free 50-question Teacher Promotion orientation practice on GigaLearn. Not an official GES examination paper.",
});

export default function ExamPracticeSessionPage() {
  return (
    <>
      <JsonLd
        webPage={{
          path: "/gigalearn/exam/practice",
          name: "Teacher Promotion Free Practice",
          description:
            "Mobile-first timed practice session for Ghana Teacher Promotion orientation on GigaLearn.",
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaLearn", path: "/gigalearn" },
          { name: "Exam Practice", path: "/gigalearn/exam" },
          { name: "Free practice", path: "/gigalearn/exam/practice" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="Teacher Promotion Free Practice"
        description="Timed orientation practice — not an official GES paper."
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
