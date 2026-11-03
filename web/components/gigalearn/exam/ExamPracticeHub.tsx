import Link from "next/link";
import { BookOpen, GraduationCap, ClipboardCheck, ArrowRight } from "lucide-react";

const centres = [
  {
    href: "/gigalearn/exam/bece/",
    title: "BECE",
    description: "Choose from your BECE subjects and start practising.",
    detail: "Subject-by-subject preparation",
    icon: GraduationCap,
    tone: "violet",
  },
  {
    href: "/gigalearn/exam/wassce/",
    title: "WASSCE",
    description: "Practise English, Core Mathematics, Science or Social Studies.",
    detail: "Four core subjects",
    icon: BookOpen,
    tone: "blue",
  },
  {
    href: "/gigalearn/exam/promotion/",
    title: "Teacher Promotion",
    description: "Select your promotion rank and prepare for your aptitude test.",
    detail: "AD II · AD I · DD · D II · D I",
    icon: ClipboardCheck,
    tone: "green",
  },
] as const;

export function ExamPracticeHub() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 pb-[calc(var(--primary-nav-offset,0px)+1rem)]" data-testid="exam-practice-hub">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-800 via-violet-700 to-purple-600 p-5 text-white shadow-lg sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-100">GigaLearn · Exam preparation</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Practice Test</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/90">Choose your examination, select a subject or rank, and start answering questions.</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-emerald-300" aria-hidden />
          Start in just a few steps
        </div>
      </header>

      <section aria-labelledby="exam-choice-title" className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-700 text-sm font-extrabold text-white">1</span>
          <h3 id="exam-choice-title" className="text-lg font-extrabold text-slate-900">Select your examination</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {centres.map(({ href, title, description, detail, icon: Icon, tone }) => (
            <Link key={href} href={href}
              className={`group flex min-h-40 flex-col rounded-2xl border-2 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 ${tone === "violet" ? "border-violet-200 bg-violet-50/70 hover:border-violet-500" : tone === "blue" ? "border-sky-200 bg-sky-50/70 hover:border-sky-500" : "border-emerald-200 bg-emerald-50/70 hover:border-emerald-500"}`}
              data-testid={`exam-centre-${href.includes("promotion") ? "promotion" : href.includes("bece") ? "bece" : "wassce"}`}>
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ${tone === "violet" ? "text-violet-700" : tone === "blue" ? "text-sky-700" : "text-emerald-700"}`}>
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="mt-3 block text-base font-extrabold text-slate-900">{title}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span>
              <span className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs font-bold text-violet-800">
                <span>{detail}</span><ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <p className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-xs leading-5 text-violet-950">
        Your next step is simple: choose an exam, pick a subject or rank, then start your practice test.
      </p>
    </main>
  );
}
