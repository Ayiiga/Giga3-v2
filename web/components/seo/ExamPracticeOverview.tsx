import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { PracticeExample, type PracticeExampleProps } from "@/components/seo/PracticeExample";
import { SUBSCRIPTION_PLANS } from "@/lib/payments/subscriptionCatalog";

const CONTENT = {
  bece: {
    title: "BECE practice for JHS learners in Ghana",
    description: "Choose a BECE subject, practise questions and use the explanations to plan your next revision session.",
    sample: { question: "A bag costs GH₵120. A shop offers a 15% discount. How much does the buyer pay?", options: ["GH₵18", "GH₵102", "GH₵105", "GH₵138"], correctIndex: 1, explanation: "The discount is 15/100 × 120 = GH₵18. Subtract it from GH₵120 to get GH₵102." },
    guides: [
      { href: "/study-guides/bece-mathematics-percentages-ghana/", label: "Percentages with Ghana cedi examples" },
      { href: "/study-guides/bece-english-comprehension-ghana/", label: "English reading comprehension" },
      { href: "/study-guides/bece-science-states-of-matter-ghana/", label: "Science revision on changes of state" },
    ],
  },
  wassce: {
    title: "WASSCE core subject revision in Ghana",
    description: "Practise English Language, Core Mathematics, Integrated Science and Social Studies in separate subject sessions.",
    sample: { question: "Solve x² − 5x + 6 = 0.", options: ["x = −2 or −3", "x = 1 or 6", "x = 2 or 3", "x = −1 or −6"], correctIndex: 2, explanation: "Factor the expression as (x − 2)(x − 3). Each factor can equal zero, giving x = 2 or x = 3. Substitute each value to check." },
    guides: [
      { href: "/study-guides/wassce-core-maths-quadratics-ghana/", label: "Core Mathematics quadratic equations" },
      { href: "/study-guides/wassce-english-summary-ghana/", label: "English summary writing" },
      { href: "/study-guides/wassce-science-photosynthesis-ghana/", label: "Integrated Science photosynthesis" },
    ],
  },
  promotion: {
    title: "Teacher Promotion aptitude practice in Ghana",
    description: "Select Assistant Director II, Assistant Director I, Deputy Director, Director II or Director I for preparation with explanations.",
    sample: { question: "A teacher uses an exit ticket to identify misconceptions and adjust the next lesson. What is the main purpose of this assessment?", options: ["Rank pupils at the end of a term", "Guide the next teaching steps", "Certify completion of a programme", "Select pupils for admission"], correctIndex: 1, explanation: "This is formative assessment. The teacher uses evidence collected during learning to give feedback and adapt instruction." },
    guides: [
      { href: "/study-guides/teacher-formative-assessment-ghana/", label: "Formative assessment worked example" },
      { href: "/study-guides/teacher-lesson-plan-objectives-ghana/", label: "Writing measurable lesson objectives" },
      { href: "/ai-for-teachers-ghana/", label: "A classroom lesson plan and AI prompt to adapt" },
    ],
  },
} satisfies Record<string, { title: string; description: string; sample: PracticeExampleProps; guides: { href: string; label: string }[] }>;

export function ExamPracticeOverview({ exam }: { exam: keyof typeof CONTENT }) {
  const content = CONTENT[exam];
  return (
    <section className="mx-auto max-w-3xl space-y-6 px-4 pb-28 pt-6 text-slate-900" aria-label={content.title}>
      <JsonLd webPage={{ path: `/gigalearn/exam/${exam}`, name: content.title, description: content.description }} />
      <h2 className="text-xl font-bold">{content.title}</h2>
      <p className="leading-7 text-slate-700">{content.description} GigaLearn is the learning service within Giga3 AI, built in Ghana for learners and teachers.</p>
      <PracticeExample {...content.sample} />
      <div className="space-y-3"><h2 className="text-lg font-semibold">How to start</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-6"><li>Choose a subject or promotion rank above.</li><li>Sign in when prompted, choose a practice mode and answer the questions.</li><li>Read the feedback, revisit the topics you missed and try another session.</li></ol>
      </div>
      <p className="text-sm leading-6 text-slate-600">The example on this page is free to try without signing in. Full practice access depends on the selected mode and account access. Basic subscriptions start at GH₵{SUBSCRIPTION_PLANS.basic.priceGhs} per month. <Link href="/pricing/" className="font-semibold text-violet-800 underline">Check current pricing and credits</Link>.</p>
      <div><h2 className="text-lg font-semibold">Free worked revision guides</h2><ul className="mt-3 space-y-3">{content.guides.map((guide) => <li key={guide.href}><Link href={guide.href} className="text-violet-800 underline">{guide.label}</Link></li>)}</ul><Link href="/study-guides/" className="mt-4 inline-block text-sm font-semibold text-violet-800 underline">Browse all 30 study guides</Link></div>
      <p className="text-xs leading-5 text-slate-600">Original example by the Giga3 AI editorial team · Updated 19 November 2026. Match your revision to the current syllabus and your teacher’s guidance. GigaLearn provides independent practice materials.</p>
    </section>
  );
}
