import { ExamPracticeOverview } from "@/components/seo/ExamPracticeOverview";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import { ExamSubjectPicker } from "@/components/gigalearn/exam/ExamSubjectPicker";
import { getExamBankMeta, examPracticeHref } from "@/lib/gigalearn/examPractice/examBankMeta";

export const metadata = publicMetadata({ path: "/gigalearn/exam/bece", title: "BECE Practice Questions and Explanations in Ghana | GigaLearn", description: "Choose a BECE subject, try a free original maths question and explore worked revision guides with GigaLearn, built in Ghana." });

export default function BeceSubjectPage() {
  const bank = getExamBankMeta("exam-bece-prep");
  const subjects = (bank?.topics ?? []).map((topic) => ({ id: topic.id, label: topic.label, questionCount: topic.questionCount, structuredCount: topic.structuredCount, available: (topic.questionCount ?? 0) > 0, href: examPracticeHref("exam-bece-prep", { mode: "learn", topic: topic.id }) }));
  return <><ProductSeoHeader compact title="BECE Practice Questions" description="Choose the subject you want to practise." showProductNav={false} /><div className="marketing-stable gigalearn-stable section-padding pt-4 pb-6"><ExamSubjectPicker title="Choose your BECE subject" description="Select one subject. Your practice session will contain questions for that subject only." backHref="/gigalearn/exam/" subjects={subjects} /></div><ExamPracticeOverview exam="bece" /></>;
}
