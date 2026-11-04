"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { getSessionToken } from "@/lib/auth";
import { getConvexSiteUrl } from "@/lib/convex/env";
import { BookOpen, Search, ShieldCheck, Download, Printer, Play, FlaskConical } from "lucide-react";

const SUBJECTS = [
  "Integrated Science", "Computing", "Mathematics", "STEM Education", "Visual Arts",
  "Biology", "Chemistry", "Physics", "Agricultural Science", "Career Technology",
  "Technical and Vocational Education", "Home Economics", "Geography",
  "Music and Performing Arts", "English Language", "Social Studies",
];
const CLASSES = ["JHS 1", "JHS 2", "JHS 3", "SHS 1", "SHS 2", "SHS 3"];
const CATEGORIES = ["Laboratory Equipment", "Teaching Aid", "Practical Materials", "Workshop Tools", "Field Equipment", "Art Materials", "Digital Tools", "Home Economics Equipment"];

type Resource = {
  _id: string; slug: string; title: string; summary: string; subject: string;
  levelBand: "jhs" | "shs"; classes: string[]; topic: string; category: string;
  activity: string; access: "free" | "subscriber"; previewText?: string | null;
  videoUrl?: string | null;
};
type Detail = Resource & {
  description: string; components: string[]; instructions: string[]; activities: string[];
  safety: string[]; commonMistakes: string[]; teacherGuidance: string;
  studentExercises: string; curriculumReference: string;
  hasImage: boolean; hasDiagram: boolean; hasGuide: boolean; hasWorksheet: boolean;
};

export function TeachingResourcesLibrary() {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const [level, setLevel] = useState("all");
  const [className, setClassName] = useState("all");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const resources = useQuery(api.teachingResources.listPublished, {
    search: search || undefined, subject: subject === "all" ? undefined : subject,
    levelBand: level === "all" ? undefined : level as "jhs" | "shs",
    className: className === "all" ? undefined : className,
    category: category === "all" ? undefined : category,
  }) as Resource[] | undefined;
  const detail = useQuery(api.teachingResources.getPublicDetail,
    selected ? { slug: selected } : "skip") as Detail | null | undefined;
  const issueDownload = useMutation(api.teachingResources.issueDownloadToken);

  const suggestions = useMemo(() => {
    if (!search.trim()) return ["microscope", "measuring cylinder", "multimeter", "solar system model"];
    return [];
  }, [search]);

  async function download(kind: "guide" | "worksheet" | "image" | "diagram") {
    const token = getSessionToken();
    if (!token || !detail) { setNotice("Please sign in to access resource downloads."); return; }
    setBusy(true); setNotice("");
    try {
      const result = await issueDownload({ sessionToken: token, resourceId: detail._id as any, fileKind: kind });
      const site = getConvexSiteUrl();
      if (!site) throw new Error("Secure download service is not configured. Please contact support.");
      window.location.assign(result.url.startsWith("http") ? result.url : site + result.url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not prepare this download.");
    } finally { setBusy(false); }
  }

  function printResource() {
    if (!detail) return;
    window.print();
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 pb-12" data-testid="teaching-resources-library">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-900 via-purple-800 to-fuchsia-700 p-5 text-white shadow-lg sm:p-7">
        <div className="flex items-center gap-3"><span className="rounded-2xl bg-white/15 p-3"><FlaskConical className="h-7 w-7" /></span><div><p className="text-xs font-bold uppercase tracking-widest text-violet-200">GigaLearn · Practical learning</p><h1 className="text-2xl font-black sm:text-3xl">Teaching Materials & Practical Resources</h1></div></div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/90">Search, explore and learn how to use educational materials, laboratory equipment, teaching aids and practical learning resources.</p>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white p-3 text-slate-900"><Search className="h-5 w-5 shrink-0 text-violet-700" /><input aria-label="Search teaching materials" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search microscope, beaker, topic or activity…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>
        {suggestions.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{suggestions.map(s => <button key={s} onClick={() => setSearch(s)} className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs text-white">{s}</button>)}</div>}
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Resource filters">
        <label className="text-xs font-semibold text-slate-700">Subject<select value={subject} onChange={e => setSubject(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm"><option value="all">All subjects</option>{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-700">Level<select value={level} onChange={e => {setLevel(e.target.value);setClassName("all");}} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm"><option value="all">JHS & SHS</option><option value="jhs">JHS 1–3</option><option value="shs">SHS 1–3</option></select></label>
        <label className="text-xs font-semibold text-slate-700">Class / Form<select value={className} onChange={e => setClassName(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm"><option value="all">All classes</option>{CLASSES.filter(c => level === "all" || c.toLowerCase().startsWith(level)).map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-700">Category<select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm"><option value="all">All categories</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
      </section>

      {selected && <section className="rounded-3xl border border-violet-200 bg-white p-4 shadow-sm print-resource" aria-live="polite">
        {!detail ? <p className="text-sm text-slate-500">Loading resource details…</p> : <>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-violet-700">{detail.subject} · {detail.classes.join(", ")}</p><h2 className="mt-1 text-xl font-black text-slate-950">{detail.title}</h2><p className="mt-1 text-sm text-slate-600">{detail.summary}</p></div><button onClick={() => setSelected(null)} className="rounded-full border px-3 py-2 text-sm">Close</button></div>
          <p className="mt-4 text-sm leading-6 text-slate-700">{detail.description}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <DetailList title="Components and functions" items={detail.components} />
            <DetailList title="How to use it" items={detail.instructions} />
            <DetailList title="Practical activities" items={detail.activities} />
            <DetailList title="Safety precautions" items={detail.safety} />
            <DetailList title="Common mistakes" items={detail.commonMistakes} />
          </div>
          {detail.teacherGuidance && <p className="mt-4 rounded-xl bg-violet-50 p-3 text-sm"><b>Teacher guidance:</b> {detail.teacherGuidance}</p>}
          {detail.studentExercises && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm"><b>Student exercises:</b> {detail.studentExercises}</p>}
          {detail.curriculumReference && <p className="mt-3 text-xs text-slate-500">Curriculum reference: {detail.curriculumReference}</p>}
          {detail.videoUrl && <a href={detail.videoUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-violet-700"><Play className="h-4 w-4" /> Watch demonstration</a>}
          <div className="mt-5 flex flex-wrap gap-2">
            {detail.hasGuide && <button disabled={busy} onClick={() => download("guide")} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white"><Download className="h-4 w-4" /> Download PDF guide</button>}
            {detail.hasWorksheet && <button disabled={busy} onClick={() => download("worksheet")} className="inline-flex items-center gap-2 rounded-xl border border-violet-300 px-4 py-3 text-sm font-bold text-violet-800">Download worksheet</button>}
            {detail.hasImage && <button onClick={() => download("image")} className="rounded-xl border px-3 py-3 text-sm">Material photo</button>}
            {detail.hasDiagram && <button onClick={() => download("diagram")} className="rounded-xl border px-3 py-3 text-sm">Labelled diagram</button>}
            <button onClick={printResource} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold"><Printer className="h-4 w-4" /> Print resource</button>
          </div>
          {detail.access === "subscriber" && <p className="mt-3 flex items-center gap-2 text-xs text-amber-800"><ShieldCheck className="h-4 w-4" /> Complete files require an active Giga3 AI subscription. Access is verified when downloading.</p>}
          {notice && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
        </>}
      </section>}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-black text-slate-950">Explore learning resources</h2><span className="text-xs text-slate-500">{resources?.length ?? 0} resources</span></div>
        {resources === undefined ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Loading resource library…</p> :
          resources.length === 0 ? <div className="rounded-2xl border border-dashed p-7 text-center"><BookOpen className="mx-auto h-8 w-8 text-violet-500" /><h3 className="mt-2 font-bold">No matching resources yet</h3><p className="mt-1 text-sm text-slate-500">Try another subject or search term. New approved practical guides will appear here.</p></div> :
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{resources.map(r => <article key={r._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-800">{r.subject}</span><span className={r.access === "free" ? "text-xs font-bold text-emerald-700" : "text-xs font-bold text-amber-700"}>{r.access === "free" ? "Free preview" : "Subscriber"}</span></div><h3 className="mt-3 font-extrabold text-slate-950">{r.title}</h3><p className="mt-1 text-sm leading-5 text-slate-600">{r.summary}</p><p className="mt-3 text-xs text-slate-500">{r.classes.join(" · ")} · {r.category}</p><button onClick={() => {setSelected(r.slug);setNotice("");}} className="mt-4 min-h-11 w-full rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white">Explore resource</button></article>)}</div>}
      </section>
      <style jsx global>{`@media print { body * { visibility: hidden !important; } .print-resource, .print-resource * { visibility: visible !important; } .print-resource { position: absolute; inset: 0; width: 100%; border: 0 !important; box-shadow: none !important; } .print-resource button, .print-resource a { display: none !important; } }`}</style>
    </main>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return <div><h3 className="text-sm font-extrabold text-slate-900">{title}</h3><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-5 text-slate-700">{items.map((item, i) => <li key={i}>{item}</li>)}</ol></div>;
}
