import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import { ExamPracticeHub } from "@/components/gigalearn/exam/ExamPracticeHub";

export const metadata = publicMetadata({
  path: "/gigalearn/exam",
  title: "GigaLearn Exam Practice | Giga3 AI",
  description: "Choose Teacher Promotion, BECE or WASSCE practice on GigaLearn.",
});

export default function GigaLearnExamPracticePage() {
  return (
    <>
      <JsonLd webPage={{ path: "/gigalearn/exam", name: "GigaLearn Exam Practice", description: "Choose Teacher Promotion, BECE or WASSCE examination practice." }} />
      <JsonLd breadcrumbs={[{ name: "Giga3 AI", path: "/" }, { name: "GigaLearn", path: "/gigalearn" }, { name: "Practice", path: "/gigalearn/exam" }]} />
      <ProductSeoHeader compact title="GigaLearn Exam Practice" description="Choose your examination and prepare with confidence." showProductNav={false} />
      <div className="marketing-stable gigalearn-stable section-padding pt-4 pb-6 sm:pt-6"><ExamPracticeHub /></div>
    </>
  );
}
