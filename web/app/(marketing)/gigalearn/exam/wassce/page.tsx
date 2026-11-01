import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import { ExamSubjectPicker } from "@/components/gigalearn/exam/ExamSubjectPicker";
import { getExamBankMeta, examPracticeHref } from "@/lib/gigalearn/examPractice/examBankMeta";

export const metadata = publicMetadata({ path: "/gigalearn/exam/wassce", title: "Choose a WASSCE Core Subject | GigaLearn", description: "Choose one of the four WASSCE core subjects on GigaLearn." });

const CORE_SUBJECTS = [
  { id: "english-language", label: "English Language", topicIds: ["english", "english-language"] },
  { id: "core-mathematics", label: "Core Mathematics", topicIds: ["mathematics", "core-mathematics"] },
  { id: "integrated-science", label: "Integrated Science", topicIds: ["science", "integrated-science"] },
  { id: "social-studies", label: "Social Studies", topicIds: ["social-studies", "social_studies"] },
] as const;

export default function WassceSubjectPage() {
  const bank = getExamBankMeta("exam-wassce-core");
  const subjects = CORE_SUBJECTS.map((subject) => {
    const topic = bank?.topics.find((item) => subject.topicIds.some((id) => id === item.id));
    const available = Boolean(topic && (topic.questionCount ?? 0) > 0);
    return { id: subject.id, label: subject.label, questionCount: topic?.questionCount, available, href: available && topic ? examPracticeHref("exam-wassce-core", { mode: "learn", topic: topic.id }) : undefined };
  });
  return <><ProductSeoHeader compact title="WASSCE Core Subject Selection" description="Choose one of the four core subjects." showProductNav={false} /><div className="marketing-stable gigalearn-stable section-padding pt-4 pb-6"><ExamSubjectPicker title="Choose your WASSCE core subject" description="For now, GigaLearn is focusing on the four core subjects. Each subject will have its own practice session." backHref="/gigalearn/exam/" subjects={subjects} /></div></>;
}
