"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { BookOpen, GraduationCap, Users, Target, Timer, RotateCcw, Layers, Play } from "lucide-react";
import { getExamBankMeta, examPracticeHref } from "@/lib/gigalearn/examPractice/examBankMeta";

type Exam = "bece" | "wassce" | "promotion";
type Mode = "practice_test" | "timed" | "revision";

const WASSCE = [
  { id: "english", label: "English Language", slug: "exam-wassce-english" },
  { id: "mathematics", label: "Core Mathematics", slug: "exam-wassce-core-mathematics" },
  { id: "science", label: "Integrated Science", slug: "exam-wassce-integrated-science" },
  { id: "social-studies", label: "Social Studies", slug: "exam-wassce-social-studies" },
];
const RANKS = [
  { id: "ad-ii", label: "Assistant Director II", slug: "exam-ad-ii" },
  { id: "ad-i", label: "Assistant Director I", slug: "exam-ad-i" },
  { id: "dd", label: "Deputy Director", slug: "exam-deputy-director" },
  { id: "d-ii", label: "Director II", slug: "exam-director-ii" },
  { id: "d-i", label: "Director I", slug: "exam-director-i" },
];

export function ExamPracticeHub() {
  const [exam, setExam] = useState<Exam>("bece");
  const [subject, setSubject] = useState("");
  const [mode, setMode] = useState<Mode>("practice_test");
  const [count, setCount] = useState("50");
  const featuredResources = useQuery(api.teachingResources.listPublished, {}) as Array<{_id:string;slug:string;title:string;summary:string;subject:string;classes:string[];access:"free"|"subscriber"}> | undefined;

  const bece = getExamBankMeta("exam-bece-prep");
  const subjects = useMemo(() => {
    if (exam === "bece") return (bece?.topics ?? []).map((t) => ({ id: t.id, label: t.label, slug: "exam-bece-prep" }));
    if (exam === "wassce") return WASSCE;
    return RANKS;
  }, [exam, bece]);

  const selected = subjects.find((item) => item.id === subject) ?? subjects[0];
  const selectedId = selected?.id ?? "";
  const selectedSlug = selected?.slug ?? "";
  const selectedBank = getExamBankMeta(selectedSlug);
  const subjectCount = exam === "bece"
    ? bece?.topics.find((topic) => topic.id === selectedId)?.questionCount ?? 0
    : (selectedBank?.pendingQuestionCount ?? 0) + (selectedBank?.approvedQuestionCount ?? 0);
  const available = subjectCount > 0;
  const freeCounts = [...new Set([5, 10, 20, 50, 100, 200, subjectCount].filter((n) => n > 0 && n <= subjectCount))];
  const freeCount = freeCounts.includes(Number(count)) ? Number(count) : Math.min(50, subjectCount);
  if (freeCount > 0 && !freeCounts.includes(freeCount)) freeCounts.push(freeCount);
  const href = exam === "promotion" && selectedSlug
    ? `/gigalearn/academy/tech/?course=${selectedSlug}&mode=${mode}&count=${count}`
    : selectedSlug
      ? `${examPracticeHref(selectedSlug, { mode, ...(exam === "bece" ? { topic: selectedId } : {}) })}&count=${freeCount}`
      : "/gigalearn/exam/";

  function changeExam(value: Exam) {
    setExam(value);
    setSubject("");
    setCount("50");
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-0 pb-[calc(var(--primary-nav-offset,0px)+1rem)]" data-testid="exam-practice-hub">
      <header className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-violet-800 via-purple-700 to-fuchsia-600 px-5 py-5 text-white shadow-lg sm:px-8 sm:py-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-100">GigaLearn · Exam preparation</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Practice <span className="text-yellow-300">Test</span></h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/95 sm:text-base">Choose an exam, subject and start solving questions immediately.</p>
          </div>
          <div className="hidden shrink-0 text-6xl sm:block" aria-hidden>🎯</div>
        </div>
      </header>

      <section className="space-y-3" aria-labelledby="exam-select-title">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-700 text-lg font-black text-white">1</span><h3 id="exam-select-title" className="text-xl font-extrabold text-slate-950">Select Exam</h3></div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {([
            { id: "bece" as const, label: "BECE", Icon: GraduationCap },
            { id: "wassce" as const, label: "WASSCE", Icon: BookOpen },
            { id: "promotion" as const, label: "Teacher Promotion", Icon: Users },
          ]).map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => changeExam(id)} aria-pressed={exam === id}
              className={`relative flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-2xl border-2 px-2 py-3 text-center shadow-sm transition ${exam === id ? "border-violet-700 bg-gradient-to-br from-violet-700 to-purple-900 text-white shadow-violet-200" : "border-slate-200 bg-white text-slate-950 hover:border-violet-300"}`}>
              {exam === id ? <span className="absolute right-2 top-2 text-lg">✓</span> : null}
              <Icon className={`h-8 w-8 ${exam === id ? "text-white" : "text-violet-700"}`} />
              <span className="text-sm font-extrabold leading-tight sm:text-base">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="subject-select-title">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-700 text-lg font-black text-white">2</span><h3 id="subject-select-title" className="text-xl font-extrabold text-slate-950">{exam === "promotion" ? "Select Rank" : "Select Subject"}</h3></div>
        <label className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-violet-100 bg-white px-4 shadow-sm">
          <BookOpen className="h-6 w-6 shrink-0 text-violet-700" />
          <span className="sr-only">{exam === "promotion" ? "Promotion rank" : "Subject"}</span>
          <select value={selectedId} onChange={(e) => setSubject(e.target.value)} className="w-full appearance-none bg-transparent py-3 text-base font-bold text-slate-950 outline-none">
            {subjects.length === 0 ? <option value="">No subjects available</option> : subjects.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <span className="text-xl text-violet-900">⌄</span>
        </label>
      </section>

      <section className="space-y-3" aria-label="Practice mode">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {([
            { id: "practice_test" as const, label: "Practice", detail: "Learn & get feedback", Icon: Target },
            { id: "timed" as const, label: "Timed", detail: "Real exam feel", Icon: Timer },
            { id: "revision" as const, label: "Revision", detail: "Retry missed questions", Icon: RotateCcw },
          ]).map(({ id, label, detail, Icon }) => (
            <button key={id} type="button" onClick={() => setMode(id)} aria-pressed={mode === id}
              className={`flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 py-3 text-center transition ${mode === id ? "border-violet-600 bg-violet-50 text-violet-900 shadow-sm" : "border-slate-200 bg-white text-slate-900"}`}>
              <span className="flex items-center gap-1.5 font-extrabold"><Icon className="h-6 w-6 text-violet-700" />{label}</span>
              <span className="text-[10px] leading-tight text-slate-600 sm:text-xs">{detail}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-4">
          <Layers className="h-6 w-6 shrink-0 text-violet-700" />
          <span className="text-sm font-bold text-slate-950">Number of Questions</span>
        </label>
        {exam === "promotion" ? <select aria-label="Number of questions" value={count} onChange={(e) => setCount(e.target.value)} className="min-h-14 rounded-2xl border-2 border-slate-200 bg-white px-4 font-bold text-slate-950 outline-none focus:border-violet-500">
          <option value="50">50 (Free)</option><option value="100">100 (Premium)</option><option value="250">250 (Premium)</option><option value="500">500 (Premium)</option>
        </select> : <select aria-label="Number of questions" value={freeCount} onChange={(e) => setCount(e.target.value)} className="min-h-14 rounded-2xl border-2 border-slate-200 bg-white px-4 font-bold">{freeCounts.map((n) => <option key={n} value={n}>{n === subjectCount ? `All ${n} questions (Free)` : `${n} questions (Free)`}</option>)}</select>}
      </section>

      <a href={available ? href : undefined} aria-disabled={!available} data-testid="start-practice-test"
        className={`flex min-h-[68px] items-center justify-center gap-3 rounded-full border-[5px] border-yellow-300 bg-gradient-to-r from-violet-800 via-purple-700 to-violet-800 px-4 text-center text-xl font-black text-white shadow-[0_8px_24px_rgba(109,40,217,.28)] transition hover:brightness-110 sm:text-2xl ${available ? "" : "cursor-not-allowed opacity-50"}`}>
        <Play className="h-7 w-7 fill-current" /> Start Practice Test <span aria-hidden>→</span>
      </a>
      {!available ? <p role="status" className="text-center text-xs text-amber-800">This practice bank is not available yet. Please choose another subject or exam.</p> : null}
      {exam === "promotion" ? <p className="rounded-full bg-violet-50 px-3 py-3 text-center text-xs text-violet-950 sm:text-sm"><span className="font-semibold">ⓘ Free: up to 50 questions</span><span className="mx-2 text-violet-300">|</span><a href="/credits/" className="font-extrabold text-violet-800 underline">Upgrade</a> for up to 500 questions. Premium access is checked securely when your session starts.</p> : null}

      <section aria-labelledby="featured-resources-title" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div><h3 id="featured-resources-title" className="text-sm font-extrabold text-slate-950">Learning materials <span className="sr-only">Teaching Materials & Practical Resources</span></h3><p className="text-xs text-slate-600">Quick practical guides for JHS & SHS</p></div>
          <a href="/gigalearn/resources/" data-testid="teaching-resources-entry" className="shrink-0 rounded-full border border-violet-300 px-3 py-2 text-xs font-bold text-violet-900 hover:bg-violet-50">View all →</a>
        </div>
        {featuredResources === undefined ? <p className="py-2 text-xs text-slate-600">Loading learning materials…</p> :
          featuredResources.length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">New practical guides will appear here as they are published.</p> :
          <div className="grid gap-2 sm:grid-cols-2">
            {featuredResources.slice(0,2).map(resource => <a key={resource._id} href={`/gigalearn/resources/?resource=${encodeURIComponent(resource.slug)}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:border-violet-300 hover:bg-violet-50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xl" aria-hidden>🔬</span>
              <span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-950">{resource.title}</span><span className="mt-0.5 block text-xs text-slate-700">{resource.subject} · {resource.classes.join(", ")}</span><span className="mt-1 block text-[11px] font-semibold text-violet-800">{resource.access === "free" ? "Free resource" : "Subscriber resource"}</span></span>
            </a>)}
          </div>}
      </section>
    </main>
  );
}
