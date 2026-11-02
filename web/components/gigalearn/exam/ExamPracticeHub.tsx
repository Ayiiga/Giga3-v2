import Link from "next/link";
import { BookOpen, GraduationCap, ClipboardCheck } from "lucide-react";

const centres = [
  {
    href: "/gigalearn/exam/promotion/",
    title: "Teacher Promotion / Aptitude Test",
    description: "Choose your promotion rank before starting your practice test.",
    detail: "AD II · AD I · Deputy Director · Director II · Director I",
    icon: ClipboardCheck,
    tone: "green",
  },
  {
    href: "/gigalearn/exam/bece/",
    title: "BECE",
    description: "Choose a BECE subject, then practise questions for that subject.",
    detail: "Subject-by-subject preparation",
    icon: GraduationCap,
    tone: "violet",
  },
  {
    href: "/gigalearn/exam/wassce/",
    title: "WASSCE",
    description: "Choose one of the four core subjects to enter its practice centre.",
    detail: "English · Core Mathematics · Integrated Science · Social Studies",
    icon: BookOpen,
    tone: "blue",
  },
] as const;

export function ExamPracticeHub() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 pb-[calc(var(--primary-nav-offset,0px)+1rem)]" data-testid="exam-practice-hub">
      <header className="space-y-2 px-1">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-700">GigaLearn · Practice</p>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Choose your examination</h2>
        <p className="text-sm text-slate-600">Select an examination centre to continue. You will choose your rank or subject before the test begins.</p>
      </header>
      <div className="grid gap-3">
        {centres.map(({ href, title, description, detail, icon: Icon, tone }) => (
          <Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600" data-testid={`exam-centre-${href.includes("promotion") ? "promotion" : href.includes("bece") ? "bece" : "wassce"}`}>
            <div className="flex items-start gap-3">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "violet" ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700"}`}>
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold text-slate-900">{title}</span>
                <span className="mt-1 block text-sm text-slate-600">{description}</span>
                <span className="mt-2 block text-xs font-semibold text-slate-500">{detail}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-violet-700">Choose {href.includes("promotion") ? "rank" : "subject"} <span aria-hidden>→</span></span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
