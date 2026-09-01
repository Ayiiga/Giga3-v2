import { Container } from "@/components/ui/Container";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const GigaLearnPageRoot = dynamic(
  () =>
    import("@/components/gigalearn/GigaLearnPageRoot").then((m) => ({
      default: m.GigaLearnPageRoot,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata = publicMetadata({
  path: "/gigalearn",
  title: "GigaLearn — AI Tutor and Exam Prep",
  description:
    "GigaLearn on Giga3 AI supports students, teachers, and parents with AI homework help, BECE and WASSCE preparation, practice questions, study plans, and classroom tools.",
});

export default function GigaLearnPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaLearn", path: "/gigalearn" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="GigaLearn"
        description="AI tutor for JHS and SHS: homework help, BECE/WASSCE prep, quizzes, and study plans. Sign in to use your credits."
        detail="Built on Giga3 AI for students, teachers, and parents in Ghana and across Africa who need structured study support alongside everyday AI chat."
        showProductNav={false}
      />
      <div className="marketing-stable section-padding pt-8 pb-8">
        <Container>
          <Suspense fallback={<p className="text-center text-muted">Loading GigaLearn…</p>}>
            <GigaLearnPageRoot />
          </Suspense>
        </Container>
      </div>
    </>
  );
}
