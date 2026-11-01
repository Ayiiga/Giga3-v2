import Link from "next/link";
import { ArrowLeft, BookOpen, LockKeyhole } from "lucide-react";

type Subject = { id: string; label: string; questionCount?: number; href?: string; available?: boolean };

export function ExamSubjectPicker({ title, description, backHref, subjects }: { title: string; description: string; backHref: string; subjects: Subject[] }) {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 pb-[calc(var(--primary-nav-offset,0px)+1rem)]" data-testid="exam-subject-picker">
      <Link href={backHref} className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-600 hover:text-violet-700"><ArrowLeft className="h-4 w-4" aria-hidden />Back to examinations</Link>
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-700">GigaLearn · Subject selection</p>
        <h2 className="text-2xl font-extrabold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">{description}</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {subjects.map((subject) => (
          <li key={subject.id}>
            {subject.available && subject.href ? (
              <Link href={subject.href} className="flex min-h-24 items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm hover:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><BookOpen className="h-5 w-5" aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block font-bold text-slate-900">{subject.label}</span><span className="mt-1 block text-xs text-slate-500">{subject.questionCount ?? 0} practice questions · Select to continue</span></span><span className="text-violet-700" aria-hidden>→</span>
              </Link>
            ) : (
              <div className="flex min-h-24 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-disabled="true">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-600"><LockKeyhole className="h-5 w-5" aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block font-bold text-slate-800">{subject.label}</span><span className="mt-1 block text-xs text-slate-500">Practice bank is being prepared</span></span>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">Only subjects with an available practice bank can be opened. We will not create or label unverified questions as official examination papers.</p>
    </main>
  );
}
