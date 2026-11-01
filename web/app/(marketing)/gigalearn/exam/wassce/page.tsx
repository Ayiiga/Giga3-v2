import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import { ExamSubjectPicker } from "@/components/gigalearn/exam/ExamSubjectPicker";
import { getExamBankMeta, examPracticeHref } from "@/lib/gigalearn/examPractice/examBankMeta";

export const metadata = publicMetadata({ path: "/gigalearn/exam/wassce", title: "WASSCE Core Subject Practice | GigaLearn", description: "Practise WASSCE English Language, Core Mathematics, Integrated Science and Social Studies." });

const CORE_SUBJECTS = [
  { id: "english", label: "English Language", courseSlug: "exam-wassce-english" },
  { id: "mathematics", label: "Core Mathematics", courseSlug: "exam-wassce-core-mathematics" },
  { id: "science", label: "Integrated Science", courseSlug: "exam-wassce-integrated-science" },
  { id: "social-studies", label: "Social Studies", courseSlug: "exam-wassce-social-studies" },
] as const;

export default function WassceSubjectPage() {
  const subjects = CORE_SUBJECTS.map((subject) => {
    const bank = getExamBankMeta(subject.courseSlug);
    const questionCount = bank?.pendingQuestionCount ?? bank?.approvedQuestionCount ?? 0;
    return {
      id: subject.id,
      label: subject.label,
      questionCount,
      available: questionCount > 0,
      href: questionCount > 0 ? examPracticeHref(subject.courseSlug, { mode: "learn" }) : undefined,
    };
  });
  return <><ProductSeoHeader compact title="WASSCE Core Subject Practice" description="Choose a subject and practise one question at a time." showProductNav={false} /><div className="marketing-stable gigalearn-stable section-padding pt-4 pb-6"><ExamSubjectPicker title="Choose your WASSCE core subject" description="Start with a short practice set. You will receive feedback and an explanation after each answer." backHref="/gigalearn/exam/" subjects={subjects} /></div></>;
}
