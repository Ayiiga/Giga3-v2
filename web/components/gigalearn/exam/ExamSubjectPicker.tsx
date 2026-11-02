import Link from "next/link";
import { ArrowLeft, BookOpen, LockKeyhole, Sparkles } from "lucide-react";

type Subject = { id: string; label: string; questionCount?: number; href?: string; available?: boolean };

const SUBJECT_STYLES: Record<string, { card: string; icon: string; accent: string; mark: string }> = {
  english: { card: "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-pink-50 hover:border-rose-400", icon: "bg-rose-100 text-rose-700", accent: "text-rose-700", mark: "bg-rose-600" },
  mathematics: { card: "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 hover:border-sky-400", icon: "bg-sky-100 text-sky-700", accent: "text-sky-700", mark: "bg-sky-600" },
  science: { card: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 hover:border-emerald-400", icon: "bg-emerald-100 text-emerald-700", accent: "text-emerald-700", mark: "bg-emerald-600" },
  "social-studies": { card: "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 hover:border-violet-400", icon: "bg-violet-100 text-violet-700", accent: "text-violet-700", mark: "bg-violet-600" },
};

export function ExamSubjectPicker({ title, description, backHref, subjects }: { title: string; description: string; backHref: string; subjects: Subject[] }) {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 pb-[calc(var(--primary-nav-offset,0px)+1rem)]" data-testid="exam-subject-picker">
      <Link href={backHref} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-violet-700"><ArrowLeft className="h-4 w-4" aria-hidden />Back to examinations</Link>
      <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 p-5 text-white shadow-lg sm:p-6">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/80"><Sparkles className="h-4 w-4" aria-hidden />GigaLearn · Your practice journey</p>
        <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/90">{description}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-white/15 px-3 py-1.5">One question at a time</span>
          <span className="rounded-full bg-white/15 px-3 py-1.5">Instant learning feedback</span>
          <span className="rounded-full bg-white/15 px-3 py-1.5">Short explanations</span>
        </div>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {subjects.map((subject, index) => {
          const style = SUBJECT_STYLES[subject.id] ?? { card: "border-slate-200 bg-white hover:border-violet-300", icon: "bg-violet-50 text-violet-700", accent: "text-violet-700", mark: "bg-violet-600" };
          return (
            <li key={subject.id}>
              {subject.available && subject.href ? (
                <Link href={subject.href} className={`group relative flex min-h-36 items-center gap-3 overflow-hidden rounded-2xl border-2 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 ${style.card}`} data-testid={`wassce-subject-${subject.id}`}>
                  <span className={`absolute inset-y-0 left-0 w-1.5 ${style.mark}`} aria-hidden />
                  <span className={`ml-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.icon}`}><BookOpen className="h-6 w-6" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold text-slate-900">{subject.label}</span>
                    <span className="mt-1 block text-xs text-slate-600">{subject.questionCount ?? 0} objective practice questions</span>
                    <span className={`mt-3 inline-flex items-center gap-1 text-sm font-extrabold ${style.accent}`}>Start practising <span aria-hidden>→</span></span>
                  </span>
                  <span className="absolute right-3 top-3 rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">Ready</span>
                </Link>
              ) : (
                <div className="flex min-h-36 items-center gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-4" aria-disabled="true">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-600"><LockKeyhole className="h-5 w-5" aria-hidden /></span>
                  <span className="min-w-0 flex-1"><span className="block font-bold text-slate-800">{subject.label}</span><span className="mt-1 block text-xs text-slate-500">Practice bank is being prepared</span></span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">These are original GigaLearn practice questions, not official WAEC past questions. Some answer keys still require subject-teacher verification; unverified items will be clearly identified and will not count as verified scores.</p>
    </main>
  );
}
