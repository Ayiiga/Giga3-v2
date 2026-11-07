"use client";

import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { getSessionToken } from "@/lib/auth";
import { getConvexSiteUrl, getConvexUrl } from "@/lib/convex/env";
import { BookOpen, Search, ShieldCheck, Download, Printer, Play, FlaskConical } from "lucide-react";

const SUBJECTS = [
  "Integrated Science", "Computing", "Mathematics", "STEM Education", "Visual Arts",
  "Biology", "Chemistry", "Physics", "Agricultural Science", "Career Technology",
  "Technical and Vocational Education", "Home Economics", "Geography",
  "Music and Performing Arts", "English Language", "Social Studies",
];
const CLASSES = ["JHS 1", "JHS 2", "JHS 3", "SHS 1", "SHS 2", "SHS 3"];
const CATEGORIES = ["Laboratory Equipment", "Laboratory Set-ups", "Laboratory Safety", "Laboratory Symbols", "Human Biology", "Teaching Aid", "Practical Materials", "Workshop Tools", "Field Equipment", "Art Materials", "Digital Tools", "Home Economics Equipment"];

type Resource = {
  _id: string; slug: string; title: string; summary: string; subject: string;
  levelBand: "jhs" | "shs" | "both"; classes: string[]; topic: string; category: string;
  activity: string; access: "free" | "subscriber"; previewText?: string | null;
  videoUrl?: string | null;
};
type Detail = Resource & {
  description: string; components: string[]; instructions: string[]; activities: string[];
  safety: string[]; commonMistakes: string[]; teacherGuidance: string;
  studentExercises: string; curriculumReference: string;
  hasImage: boolean; hasDiagram: boolean; hasGuide: boolean; hasWorksheet: boolean; fullAccess: boolean;
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
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [adminTitle, setAdminTitle] = useState("");
  const [adminSubject, setAdminSubject] = useState("Integrated Science");
  const [adminLevel, setAdminLevel] = useState<"jhs" | "shs">("jhs");
  const [adminClass, setAdminClass] = useState("JHS 1");
  const [adminSummary, setAdminSummary] = useState("");
  const [adminDescription, setAdminDescription] = useState("");
  const [adminTopic, setAdminTopic] = useState("");
  const [adminCategory, setAdminCategory] = useState("Laboratory Equipment");
  const [adminActivity, setAdminActivity] = useState("");
  const [adminInstructions, setAdminInstructions] = useState("");
  const [adminComponents, setAdminComponents] = useState("");
  const [adminSafety, setAdminSafety] = useState("");
  const [adminExercises, setAdminExercises] = useState("");
  const [adminAccess, setAdminAccess] = useState<"free" | "subscriber">("subscriber");
  const [adminMessage, setAdminMessage] = useState("");
  useEffect(() => {
    // Resolve the persisted browser session before showing subscriber detail.
    setSessionToken(getSessionToken());
    setSessionReady(true);
  }, []);
  useEffect(() => {
    const resourceSlug = new URLSearchParams(window.location.search).get("resource");
    if (resourceSlug) setSelected(resourceSlug);
  }, []);
  const admin = useQuery(api.adminAuth.isCurrentUserPlatformAdmin, sessionToken ? { sessionToken } : "skip");
  const createResource = useMutation(api.teachingResources.createResource);
  const seedStarter = useMutation(api.teachingResources.seedStarterResources);
  const seedScienceAids = useMutation(api.teachingResources.seedScienceLearningAids);
  const listAdmin = useQuery(api.teachingResources.listAdminResources, sessionToken && admin?.isAdmin ? { sessionToken } : "skip");
  const setResourceStatus = useMutation(api.teachingResources.updateResourceStatus);
  const createUploadUrl = useMutation(api.teachingResources.createUploadUrl);
  const attachFile = useMutation(api.teachingResources.attachResourceFile);
  const resources = useQuery(api.teachingResources.listPublished, {
    search: search || undefined, subject: subject === "all" ? undefined : subject,
    levelBand: level === "all" ? undefined : level as "jhs" | "shs",
    className: className === "all" ? undefined : className,
    category: category === "all" ? undefined : category,
  }) as Resource[] | undefined;
  const detail = useQuery(api.teachingResources.getPublicDetail,
    selected && sessionReady ? { slug: selected, sessionToken: sessionToken ?? undefined } : "skip") as Detail | null | undefined;
  const issueDownload = useMutation(api.teachingResources.issueDownloadToken);

  const suggestions = useMemo(() => {
    if (!search.trim()) return ["microscope", "measuring cylinder", "multimeter", "solar system model"];
    return [];
  }, [search]);

  async function download(kind: "guide" | "worksheet" | "image" | "diagram") {
    const token = sessionToken;
    if (!token || !detail) { setNotice("Please sign in to access resource downloads."); return; }
    setBusy(true); setNotice("");
    try {
      const result = await issueDownload({ sessionToken: token, resourceId: detail._id as any, fileKind: kind });
      const site = getConvexSiteUrl() ?? getConvexUrl()?.replace(".convex.cloud", ".convex.site");
      if (!site) throw new Error("Secure download service is not configured. Please contact support.");
      window.location.assign(site.replace(/\/$/, "") + "/teaching-resource-download?token=" + encodeURIComponent(result.token));
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
      <header className="overflow-hidden rounded-2xl border border-violet-200 bg-white p-4 text-slate-950 shadow-sm sm:p-5">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-violet-100 p-2.5 text-violet-800"><FlaskConical className="h-6 w-6" /></span><div><p className="text-[10px] font-bold uppercase tracking-widest text-violet-700">GigaLearn · Learning library</p><h1 className="text-xl font-black text-slate-950 sm:text-2xl">Teaching & Practical Materials</h1></div></div>
        <p className="mt-2 max-w-3xl text-sm leading-5 text-slate-700">Explore equipment, practical guides and learning aids for JHS and SHS.</p>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 p-3 text-slate-950"><Search className="h-5 w-5 shrink-0 text-violet-800" /><input aria-label="Search teaching materials" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search microscope, beaker or topic…" className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 placeholder:text-slate-500 outline-none" /></div>
        {suggestions.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{suggestions.map(s => <button key={s} onClick={() => setSearch(s)} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-900">{s}</button>)}</div>}
      </header>



      {admin?.isAdmin && <details className="rounded-2xl border border-amber-300 bg-amber-50 p-4"><summary className="cursor-pointer list-none font-extrabold text-amber-950"><span className="inline-flex items-center gap-2">⚙️ Manage Resources <span className="text-xs font-semibold text-amber-800">(administrator only)</span></span><p className="mt-1 text-xs font-normal text-amber-900">Add, upload and review learning materials. Open only when you need to manage the library.</p></summary><div className="mt-4 border-t border-amber-200 pt-4">
        <h2 className="font-extrabold text-amber-950">Administrator · Add a resource</h2>
        <button type="button" disabled={busy || !sessionToken} onClick={async () => {setBusy(true);try {const result=await seedStarter({sessionToken:sessionToken!});setAdminMessage(result.message);}catch(e){setAdminMessage(e instanceof Error?e.message:"Could not load starter resources.");}finally{setBusy(false);}}} className="mt-3 rounded-lg border border-amber-700 px-3 py-2 text-xs font-bold text-amber-950">Load four starter equipment guides</button>
        <button type="button" disabled={busy || !sessionToken} onClick={async () => {setBusy(true);try {const result=await seedScienceAids({sessionToken:sessionToken!});setAdminMessage(result.message);}catch(e){setAdminMessage(e instanceof Error?e.message:"Could not load science learning aids.");}finally{setBusy(false);}}} className="mt-3 ml-2 rounded-lg bg-violet-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Publish 16 Science Learning Aids</button>
        <p className="mt-1 text-xs text-amber-900">The four starter guides are published as subscriber resources. The Science Learning Aids button publishes 16 separate, searchable JHS/SHS science records; attach the matching image to each record in the review queue. New resources created below are saved as drafts until reviewed.</p>
        <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={async e => {
          e.preventDefault(); if (!sessionToken) return;
          setBusy(true); setAdminMessage("");
          try {
            const slug = adminTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            await createResource({
              sessionToken, slug, title: adminTitle, summary: adminSummary, description: adminDescription,
              subject: adminSubject, levelBand: adminLevel, classes: [adminClass], topic: adminTopic,
              category: adminCategory, activity: adminActivity,
              componentsJson: JSON.stringify(adminComponents.split("\n").map(x => x.trim()).filter(Boolean)),
              instructionsJson: JSON.stringify(adminInstructions.split("\n").map(x => x.trim()).filter(Boolean)),
              activitiesJson: JSON.stringify(adminActivity ? [adminActivity] : []),
              safetyJson: JSON.stringify(adminSafety.split("\n").map(x => x.trim()).filter(Boolean)),
              mistakesJson: JSON.stringify([]), studentExercises: adminExercises,
              previewText: adminSummary, access: adminAccess, status: "draft",
            });
            setAdminMessage("Draft saved. Upload its files and complete review before publishing.");
            setAdminTitle(""); setAdminSummary(""); setAdminDescription("");
          } catch (error) { setAdminMessage(error instanceof Error ? error.message : "Could not save resource."); }
          finally { setBusy(false); }
        }}>
          <input required value={adminTitle} onChange={e => setAdminTitle(e.target.value)} placeholder="Resource / equipment name" className="min-h-11 rounded-lg border border-amber-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-500" />
          <select value={adminSubject} onChange={e => setAdminSubject(e.target.value)} className="min-h-11 rounded-lg border border-amber-300 bg-white px-3 text-sm text-slate-950">{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select>
          <select value={adminLevel} onChange={e => {setAdminLevel(e.target.value as "jhs"|"shs");setAdminClass(e.target.value === "jhs" ? "JHS 1" : "SHS 1");}} className="min-h-11 rounded-lg border bg-white px-3 text-sm"><option value="jhs">JHS</option><option value="shs">SHS</option></select>
          <select value={adminClass} onChange={e => setAdminClass(e.target.value)} className="min-h-11 rounded-lg border bg-white px-3 text-sm">{CLASSES.filter(x => x.toLowerCase().startsWith(adminLevel)).map(x => <option key={x}>{x}</option>)}</select>
          <input required value={adminSummary} onChange={e => setAdminSummary(e.target.value)} placeholder="Short summary" className="min-h-11 rounded-lg border px-3 text-sm sm:col-span-2" />
          <input value={adminTopic} onChange={e => setAdminTopic(e.target.value)} placeholder="Curriculum topic" className="min-h-11 rounded-lg border px-3 text-sm" />
          <select value={adminCategory} onChange={e => setAdminCategory(e.target.value)} className="min-h-11 rounded-lg border bg-white px-3 text-sm">{CATEGORIES.map(x => <option key={x}>{x}</option>)}</select>
          <textarea required value={adminDescription} onChange={e => setAdminDescription(e.target.value)} placeholder="Description and educational purpose" className="min-h-20 rounded-lg border border-amber-300 bg-white p-3 text-sm text-slate-950 placeholder:text-slate-500 sm:col-span-2" />
          <textarea value={adminComponents} onChange={e => setAdminComponents(e.target.value)} placeholder="Components and functions (one per line)" className="min-h-20 rounded-lg border p-3 text-sm" />
          <textarea value={adminInstructions} onChange={e => setAdminInstructions(e.target.value)} placeholder="Step-by-step instructions (one per line)" className="min-h-20 rounded-lg border p-3 text-sm" />
          <textarea value={adminActivity} onChange={e => setAdminActivity(e.target.value)} placeholder="Practical activity" className="min-h-16 rounded-lg border border-amber-300 bg-white p-3 text-sm text-slate-950 placeholder:text-slate-500" />
          <textarea value={adminSafety} onChange={e => setAdminSafety(e.target.value)} placeholder="Safety precautions (one per line)" className="min-h-20 rounded-lg border p-3 text-sm" />
          <textarea value={adminExercises} onChange={e => setAdminExercises(e.target.value)} placeholder="Student exercises / teacher notes" className="min-h-20 rounded-lg border p-3 text-sm" />
          <select value={adminAccess} onChange={e => setAdminAccess(e.target.value as "free"|"subscriber")} className="min-h-11 rounded-lg border bg-white px-3 text-sm"><option value="free">Free resource</option><option value="subscriber">Subscriber-only resource</option></select>
          <button disabled={busy} className="min-h-11 rounded-lg bg-amber-900 px-4 text-sm font-bold text-white disabled:opacity-50">Save draft resource</button>
        </form>
        {adminMessage && <p role="status" className="mt-3 text-sm text-amber-950">{adminMessage}</p>}
        <div className="mt-5 border-t border-amber-200 pt-4">
          <h3 className="font-bold text-amber-950">Resource review queue</h3>
          {!listAdmin ? <p className="mt-2 text-xs text-amber-900">Loading administration records…</p> : listAdmin.length === 0 ? <p className="mt-2 text-xs text-amber-900">No resource records yet.</p> : <div className="mt-2 space-y-2">{listAdmin.map((r: any) => <div key={r._id} className="rounded-xl border border-amber-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold text-slate-900">{r.title}</p><p className="text-xs text-slate-500">{r.subject} · {r.status} · {r.access}</p></div><div className="flex flex-wrap gap-1">
              {(["draft","pending","published","archived"] as const).filter(s => s !== r.status).map(s => <button key={s} disabled={busy} onClick={async () => {setBusy(true);try {await setResourceStatus({sessionToken:sessionToken!,resourceId:r._id,status:s});}catch(e){setAdminMessage(e instanceof Error?e.message:"Status update failed.");}finally{setBusy(false);}}} className="rounded-lg border px-2 py-1 text-[10px] font-bold text-violet-800">{s}</button>)}
            </div></div>
            <div className="mt-2 flex flex-wrap gap-2">{(["guide","worksheet","image","diagram"] as const).map(kind => <label key={kind} className="cursor-pointer rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700">{kind} {kind==="guide"?r.hasGuide:kind==="worksheet"?r.hasWorksheet:kind==="image"?r.hasImage:r.hasDiagram ? "✓" : "+"}<input type="file" accept={kind==="guide"||kind==="worksheet"?"application/pdf":kind==="image"?"image/jpeg,image/png,image/webp":"image/png,image/jpeg"} className="hidden" onChange={async e => {const file=e.target.files?.[0];if(!file||!sessionToken)return;setBusy(true);try{const uploadUrl=await createUploadUrl({sessionToken});const response=await fetch(uploadUrl,{method:"POST",headers:{"Content-Type":file.type},body:file});if(!response.ok)throw new Error("File upload failed.");const {storageId}=await response.json();await attachFile({sessionToken,resourceId:r._id,fileKind:kind,storageId});setAdminMessage(`${kind} uploaded for ${r.title}.`);}catch(err){setAdminMessage(err instanceof Error?err.message:"Upload failed.");}finally{setBusy(false);e.target.value="";}}}/></label>)}</div>
          </div>)}</div>}
        </div>
      </div></details>}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Resource filters">
        <label className="text-xs font-semibold text-slate-700">Subject<select value={subject} onChange={e => setSubject(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm"><option value="all">All subjects</option>{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-700">Level<select value={level} onChange={e => {setLevel(e.target.value);setClassName("all");}} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm"><option value="all">JHS & SHS</option><option value="jhs">JHS 1–3</option><option value="shs">SHS 1–3</option></select></label>
        <label className="text-xs font-semibold text-slate-700">Class / Form<select value={className} onChange={e => setClassName(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm"><option value="all">All classes</option>{CLASSES.filter(c => level === "all" || c.toLowerCase().startsWith(level)).map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-700">Category<select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm"><option value="all">All categories</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
      </section>

      {selected && <section className="rounded-3xl border border-violet-200 bg-white p-4 shadow-sm print-resource" aria-live="polite">
        {!sessionReady || detail === undefined ? <p className="text-sm text-slate-500">Checking your subscription and loading resource details…</p> : !detail ? <p className="text-sm text-slate-500">This resource is no longer available. Refresh the library and try again.</p> : <>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-violet-700">{detail.subject} · {detail.classes.join(", ")}</p><h2 className="mt-1 text-xl font-black text-slate-950">{detail.title}</h2><p className="mt-1 text-sm text-slate-600">{detail.summary}</p></div><button onClick={() => setSelected(null)} className="rounded-full border px-3 py-2 text-sm">Close</button></div>
          <p className="mt-4 text-sm leading-6 text-slate-700">{detail.description}</p>
          {!detail.fullAccess && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">You are viewing a free preview. Sign in with an active Giga3 AI subscription to unlock the complete practical instructions, teacher notes and student exercises.</div>}
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
            <button disabled={!detail.fullAccess} onClick={printResource} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"><Printer className="h-4 w-4" /> Print resource</button>
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
