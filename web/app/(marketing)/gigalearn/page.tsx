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
        title="GigaLearn — AI tutor for Ghana and West Africa"
        description="Practical learning support for JHS, SHS, and families: topic explainers, quiz generators, exam prep for BECE and WASSCE, homework photo analysis, and teacher planning tools."
        detail="Student tools include practice questions, revision guides, and personalized study plans. Teachers can generate lesson notes, assessments, and rubrics. Parents get progress-friendly study tips. Sign in with Giga3 AI credits to use each tool."
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
