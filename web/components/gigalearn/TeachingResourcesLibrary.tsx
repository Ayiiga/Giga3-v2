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
  videoUrl?: string | null; imageUrl?: string | null;
};
function ResourceDiagram({ title, category }: { title: string; category: string }) {
  const value = (title + " " + category).toLowerCase();
  const microscope = value.includes("microscope");
  const thermometer = value.includes("thermometer");
  const beaker = value.includes("beaker");
  const multimeter = value.includes("multimeter") || value.includes("electric");
  const heading = microscope ? "COMPOUND LIGHT MICROSCOPE" : thermometer ? "LABORATORY THERMOMETER" : beaker ? "LABORATORY BEAKER" : multimeter ? "DIGITAL MULTIMETER" : title.toUpperCase();
  return (
    <svg viewBox="0 0 360 640" role="img" aria-label={"9 by 16 labelled educational diagram: " + title} className="block h-auto w-full bg-[#f8f7ff]">
      <defs><linearGradient id="diagBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f5f0ff"/><stop offset="1" stopColor="#e8e5ff"/></linearGradient><linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f8fafc"/><stop offset="1" stopColor="#94a3b8"/></linearGradient></defs>
      <rect width="360" height="640" rx="22" fill="url(#diagBg)"/>
      <text x="180" y="38" textAnchor="middle" fontSize="13" fontWeight="800" letterSpacing="1.2" fill="#5b21b6">GIGALEARN • VISUAL STUDY GUIDE</text>
      <text x="180" y="66" textAnchor="middle" fontSize={heading.length > 24 ? 13 : 16} fontWeight="900" fill="#17133b">{heading}</text>
      {microscope && <>
        <g stroke="#26345c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M142 130 L177 105 L218 168 L193 187 Z" fill="url(#metal)"/><path d="M165 112 L185 98 L230 160 L211 174 Z" fill="#64748b"/>
          <path d="M207 169 Q250 190 241 245 Q234 280 197 286" fill="none" stroke="#5b7cba" strokeWidth="20"/>
          <path d="M191 285 L116 285 Q92 285 92 308 L92 321 L263 321 Q275 321 275 309 L275 303 Q275 285 256 285 L225 285" fill="none" stroke="#334b83" strokeWidth="18"/>
          <path d="M119 285 L151 225 L205 225" fill="none" stroke="#334b83" strokeWidth="16"/><path d="M139 225 L215 225" stroke="#111827" strokeWidth="7"/><path d="M123 210 L215 210" stroke="#64748b" strokeWidth="7"/>
          <circle cx="208" cy="191" r="12" fill="#f8fafc"/><path d="M174 228 L174 246" stroke="#f59e0b" strokeWidth="6"/><path d="M142 249 L210 249" stroke="#f8fafc" strokeWidth="8"/><path d="M176 249 L176 269" stroke="#0f172a" strokeWidth="5"/>
        </g>
        <g fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M170 117 L85 112 L45 112"/><path d="M220 191 L286 160 L320 160"/><path d="M180 228 L75 220 L40 220"/><path d="M170 250 L285 270 L325 270"/><path d="M200 300 L95 355 L38 355"/><path d="M255 315 L290 385 L325 385"/></g>
        <g fill="#24134f" fontSize="11" fontWeight="800"><text x="12" y="102">Eyepiece</text><text x="286" y="148">Focus knob</text><text x="10" y="210">Objective lens</text><text x="286" y="258">Stage</text><text x="10" y="370">Arm</text><text x="286" y="402">Base</text></g>
        <text x="180" y="465" textAnchor="middle" fontSize="12" fontWeight="800" fill="#4c1d95">LIGHT PATH & PARTS</text><text x="180" y="490" textAnchor="middle" fontSize="11" fill="#312e81">Light passes through the specimen</text><text x="180" y="510" textAnchor="middle" fontSize="11" fill="#312e81">and lenses to magnify the image.</text>
      </>}
      {thermometer && <>
        <rect x="154" y="125" width="52" height="260" rx="26" fill="#fff" stroke="#334155" strokeWidth="5"/><rect x="176" y="165" width="9" height="205" rx="5" fill="#ef4444"/><circle cx="180" cy="385" r="39" fill="#ef4444" stroke="#334155" strokeWidth="5"/><circle cx="180" cy="385" r="25" fill="#fb7185"/>
        {Array.from({length:8},(_,i)=><g key={i}><path d={"M207 " + (170+i*24) + " h18"} stroke="#334155" strokeWidth="3"/><text x="233" y={174+i*24} fontSize="10" fill="#334155">{100-i*10}°</text></g>)}
        <path d="M154 180 L92 150 L30 150 M207 285 L268 260 L330 260 M180 420 L180 470" stroke="#7c3aed" strokeWidth="2" fill="none"/><g fill="#24134f" fontSize="12" fontWeight="800"><text x="10" y="138">Scale</text><text x="272" y="248">Liquid column</text><text x="180" y="492" textAnchor="middle">Bulb / reservoir</text></g><text x="180" y="540" textAnchor="middle" fontSize="12" fill="#4c1d95">Read at eye level • °C</text>
      </>}
      {beaker && <>
        <path d="M110 140 L250 140 L235 430 Q180 455 125 430 Z" fill="#dbeafe" fillOpacity=".75" stroke="#2563eb" strokeWidth="6"/><path d="M117 300 Q180 285 243 300 L236 427 Q180 449 126 427 Z" fill="#38bdf8" fillOpacity=".6"/><path d="M110 140 L250 140 L250 160 L110 160 Z" fill="#94a3b8" stroke="#334155" strokeWidth="3"/>
        {Array.from({length:6},(_,i)=><path key={i} d={"M220 " + (205+i*28) + " h20"} stroke="#1e40af" strokeWidth="3"/>)}
        <path d="M120 165 L50 130 L20 130 M235 300 L300 280 L340 280 M235 430 L295 460 L340 460" stroke="#7c3aed" strokeWidth="2" fill="none"/><g fill="#24134f" fontSize="12" fontWeight="800"><text x="8" y="118">Rim & spout</text><text x="270" y="266">Graduations</text><text x="272" y="482">Flat base</text></g><text x="180" y="520" textAnchor="middle" fontSize="12" fill="#4c1d95">For holding, mixing & heating</text><text x="180" y="542" textAnchor="middle" fontSize="11" fill="#4c1d95">Graduations show approximate volume</text>
      </>}
      {multimeter && <>
        <rect x="102" y="120" width="156" height="300" rx="24" fill="#25334c" stroke="#111827" strokeWidth="5"/><rect x="126" y="148" width="108" height="70" rx="8" fill="#d9f99d" stroke="#111827" strokeWidth="4"/><text x="180" y="193" textAnchor="middle" fontSize="28" fontWeight="900" fill="#1f2937">12.0</text><circle cx="180" cy="294" r="48" fill="#475569" stroke="#cbd5e1" strokeWidth="6"/><path d="M180 294 L204 263" stroke="#f8fafc" strokeWidth="7" strokeLinecap="round"/><circle cx="180" cy="294" r="8" fill="#f8fafc"/><circle cx="145" cy="376" r="10" fill="#111827" stroke="#ef4444" strokeWidth="4"/><circle cx="215" cy="376" r="10" fill="#111827" stroke="#0f172a" strokeWidth="4"/>
        <path d="M126 180 L62 160 L20 160 M226 295 L295 270 L340 270 M145 376 L70 430 L20 430 M215 376 L285 460 L340 460" stroke="#7c3aed" strokeWidth="2" fill="none"/><g fill="#24134f" fontSize="12" fontWeight="800"><text x="8" y="148">Display</text><text x="278" y="255">Selector dial</text><text x="8" y="448">COM socket</text><text x="278" y="480">V / Ω socket</text></g><text x="180" y="530" textAnchor="middle" fontSize="12" fill="#4c1d95">Measures voltage, current & resistance</text>
      </>}
      {!microscope && !thermometer && !beaker && !multimeter && <><rect x="55" y="145" width="250" height="260" rx="20" fill="#ede9fe" stroke="#7c3aed" strokeWidth="3"/><text x="180" y="260" textAnchor="middle" fontSize="54">📘</text><text x="180" y="310" textAnchor="middle" fontSize="13" fontWeight="800" fill="#312e81">{category}</text><text x="180" y="340" textAnchor="middle" fontSize="11" fill="#4338ca">Study the description and key points</text></>}
      <rect x="18" y="570" width="324" height="48" rx="12" fill="#4c1d95"/><text x="180" y="590" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">GIGALEARN • LABELLED DIAGRAM</text><text x="180" y="605" textAnchor="middle" fontSize="9" fill="#ede9fe">Tap image to zoom • 9:16 portrait</text>
    </svg>
  );
}

type CommonsImage = { thumb: string; original: string; page: string; license: string; artist: string };

function useCommonsImage(title: string, category: string, enabled: boolean) {
  const [image, setImage] = useState<CommonsImage | null>(null);
  useEffect(() => {
    if (!enabled || !title) return;
    let active = true;
    const query = (title + " " + category).replace(/[<>]/g, " ").slice(0, 140);
    const endpoint = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=1&gsrsearch=" +
      encodeURIComponent("filetype:bitmap " + query) +
      "&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=900&format=json&origin=*";
    fetch(endpoint).then(r => { if (!r.ok) throw new Error("Commons image lookup failed"); return r.json(); })
      .then(data => {
        const page = Object.values(data?.query?.pages ?? {})[0] as any;
        const info = page?.imageinfo?.[0];
        if (!active || !info?.thumburl || !info?.descriptionurl) return;
        const meta = info.extmetadata ?? {};
        const clean = (value: any) => String(value?.value ?? "").replace(/<[^>]*>/g, "").trim();
        setImage({
          thumb: info.thumburl, original: info.url ?? info.thumburl, page: info.descriptionurl,
          license: clean(meta.LicenseShortName) || "See source page for licence",
          artist: clean(meta.Artist) || clean(meta.Credit) || "See source page",
        });
      }).catch(() => { if (active) setImage(null); });
    return () => { active = false; };
  }, [title, category, enabled]);
  return image;
}

function ResourceVisual({ title, category, imageUrl, large = false }: {
  title: string; category: string; imageUrl?: string | null; large?: boolean;
}) {
  const [zoomed, setZoomed] = useState(false);
  const commons = useCommonsImage(title, category, !imageUrl);
  const resolvedImage = imageUrl || commons?.thumb;
  const visual = resolvedImage
    ? <img src={resolvedImage} alt={"Photograph of " + title} className="block h-full w-full bg-white object-contain" loading="lazy" />
    : <ResourceDiagram title={title} category={category} />;
  return (
    <>
      <button type="button" onClick={() => setZoomed(true)} aria-label={"Zoom labelled diagram for " + title} className={"group relative mx-auto block w-full overflow-hidden rounded-2xl border border-violet-200 bg-[#f8f7ff] text-left shadow-sm focus:outline-none focus:ring-4 focus:ring-violet-300 " + (large ? "max-w-[420px]" : "max-w-[260px]")}>
        <div className="relative aspect-[9/16] w-full">{visual}</div>
        <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/85 px-3 py-1.5 text-xs font-bold text-white shadow">⌕ Tap to zoom</span>
      </button>
      {commons && !imageUrl && <div className="mx-auto mt-1 max-w-[420px] text-[10px] leading-4 text-slate-600">
        Photo: {commons.artist} · {commons.license} · <a href={commons.page} target="_blank" rel="noreferrer" className="font-semibold text-violet-800 underline">Source & licence</a>
        {" · "}<a href={commons.original} target="_blank" rel="noreferrer" download className="font-semibold text-violet-800 underline">Download original</a>
      </div>}
      {zoomed && <div role="dialog" aria-modal="true" aria-label={"Zoomed learning diagram: " + title} className="fixed inset-0 z-[100] flex items-center justify-center overflow-auto bg-slate-950/95 p-3" onClick={() => setZoomed(false)}>
        <button type="button" onClick={() => setZoomed(false)} className="fixed right-4 top-4 z-[101] rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950 shadow-lg">Close ✕</button>
        <div className="my-12 w-full max-w-[520px]" onClick={e => e.stopPropagation()} style={{touchAction:"pinch-zoom pan-y"}}>
          <div className="aspect-[9/16] w-full overflow-hidden rounded-xl bg-white shadow-2xl">{visual}</div>
          <p className="mt-3 text-center text-xs font-semibold text-white">Pinch with two fingers to zoom • Tap outside to close</p>
        </div>
      </div>}
    </>
  );
}

type Detail = Resource & {
  description: string; components: string[]; instructions: string[]; activities: string[];
  safety: string[]; commonMistakes: string[]; teacherGuidance: string;
  studentExercises: string; curriculumReference: string;
  hasImage: boolean; imageUrl?: string | null; hasDiagram: boolean; hasGuide: boolean; hasWorksheet: boolean; fullAccess: boolean; isSubscriber: boolean;
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
  const [uploadResourceId, setUploadResourceId] = useState("");
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
    if (!token || !detail) { setNotice("Sign in with an active Giga3 AI subscription to download this resource."); return; }
    if (!detail.isSubscriber) { setNotice("Downloads are reserved for active Giga3 AI subscribers. You can continue viewing this resource for free."); return; }
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
    if (!detail.isSubscriber) { setNotice("Printing is reserved for active Giga3 AI subscribers. You can continue viewing this resource for free."); return; }
    setNotice("");
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
      <section aria-label="Quick science collections" className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
        <h2 className="text-sm font-extrabold text-violet-950">Quick access · Science collections</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" onClick={()=>{setSearch("");setLevel("jhs");setClassName("JHS 1");setCategory("Laboratory Equipment");setSubject("all");setSelected(null);}} className="rounded-xl bg-white px-3 py-3 text-left text-sm font-bold text-violet-900 shadow-sm">🧪 Laboratory equipment <span className="block text-xs font-normal text-slate-600">JHS & SHS apparatus</span></button>
          <button type="button" onClick={()=>{setSearch("");setLevel("jhs");setClassName("JHS 1");setCategory("Laboratory Set-ups");setSubject("all");setSelected(null);}} className="rounded-xl bg-white px-3 py-3 text-left text-sm font-bold text-violet-900 shadow-sm">⚗️ JHS laboratory set-ups <span className="block text-xs font-normal text-slate-600">Practical arrangements</span></button>
          <button type="button" onClick={()=>{setSearch("");setLevel("jhs");setClassName("JHS 1");setCategory("Human Biology");setSubject("all");setSelected(null);}} className="rounded-xl bg-white px-3 py-3 text-left text-sm font-bold text-violet-900 shadow-sm">🫀 9 human body systems <span className="block text-xs font-normal text-slate-600">Organs, labels and functions</span></button>
        </div>
      </section>

      {admin?.isAdmin && <details className="rounded-2xl border border-amber-300 bg-amber-50 p-4"><summary className="cursor-pointer list-none font-extrabold text-amber-950"><span className="inline-flex items-center gap-2">⚙️ Manage Resources <span className="text-xs font-semibold text-amber-800">(administrator only)</span></span><p className="mt-1 text-xs font-normal text-amber-900">Add, upload and review learning materials. Open only when you need to manage the library.</p></summary><div className="mt-4 border-t border-amber-200 pt-4">
        <h2 className="font-extrabold text-amber-950">Administrator · Add a resource</h2>
        <button type="button" disabled={busy || !sessionToken} onClick={async () => {setBusy(true);try {const result=await seedStarter({sessionToken:sessionToken!});setAdminMessage(result.message);}catch(e){setAdminMessage(e instanceof Error?e.message:"Could not load starter resources.");}finally{setBusy(false);}}} className="mt-3 rounded-lg border border-amber-700 px-3 py-2 text-xs font-bold text-amber-950">Load four starter equipment guides</button>
        <button type="button" disabled={busy || !sessionToken} onClick={async () => {setBusy(true);try {const result=await seedScienceAids({sessionToken:sessionToken!});setAdminMessage(result.message);}catch(e){setAdminMessage(e instanceof Error?e.message:"Could not load science learning aids.");}finally{setBusy(false);}}} className="mt-3 w-full rounded-xl bg-violet-800 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">Publish / update complete Science Aids Library</button>
        <p className="mt-2 text-xs leading-5 text-amber-950">This single action publishes individual searchable resources for laboratory equipment, JHS practical set-ups and all nine human body systems. Existing resources are kept; only missing records are added. Resources are free to view.</p>

        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
          <p className="text-sm font-bold text-violet-950">Easy image upload — choose the resource, then choose its photo</p>
          <p className="mt-1 text-xs text-violet-900">No filename matching needed. Select a resource from the list and attach one JPG, PNG or WebP image.</p>
          <select aria-label="Choose resource for image upload" value={uploadResourceId} onChange={e=>setUploadResourceId(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-violet-200 bg-white px-3 text-sm text-slate-900">
            <option value="">Choose a learning resource…</option>
            {(listAdmin ?? []).map((r:any)=><option key={r._id} value={r._id}>{r.title} · {r.status}</option>)}
          </select>
          <label className="mt-2 block rounded-lg border border-violet-300 bg-white p-3 text-sm font-semibold text-violet-900">Choose image for selected resource
            <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-xs" disabled={!uploadResourceId || busy} onChange={async e=>{const file=e.target.files?.[0];if(!file||!sessionToken||!uploadResourceId)return;setBusy(true);try{const uploadUrl=await createUploadUrl({sessionToken});const response=await fetch(uploadUrl,{method:"POST",headers:{"Content-Type":file.type},body:file});if(!response.ok)throw new Error("Image upload failed.");const {storageId}=await response.json();await attachFile({sessionToken,resourceId:uploadResourceId as any,fileKind:"image",storageId});setAdminMessage("Image attached successfully.");}catch(err){setAdminMessage(err instanceof Error?err.message:"Image upload failed.");}finally{setBusy(false);e.target.value="";}}}/>
          </label>
        </div>
        <details className="mt-3 rounded-xl border border-violet-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-bold text-violet-950">Advanced: bulk upload a folder of named images</summary>
          <p className="mt-2 text-xs text-violet-900">Filenames can match either the resource slug or its title. Spaces, underscores and hyphens are treated as equivalent.</p>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="mt-2 block w-full text-xs text-slate-700" onChange={async e => {
            const files = Array.from(e.target.files ?? []);
            if (!files.length || !sessionToken || !listAdmin) return;
            setBusy(true); let uploaded = 0; const skipped: string[] = [];
            try {
              for (const file of files) {
                const slug = file.name.replace(/\.[^.]+$/, "").toLowerCase();
                const resource = listAdmin.find((r: any) => r.slug === slug);
                if (!resource) { skipped.push(file.name); continue; }
                const uploadUrl = await createUploadUrl({ sessionToken });
                const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
                if (!response.ok) throw new Error(`Upload failed for ${file.name}.`);
                const { storageId } = await response.json();
                await attachFile({ sessionToken, resourceId: resource._id, fileKind: "image", storageId });
                uploaded++;
              }
              setAdminMessage(`Attached ${uploaded} images.${skipped.length ? ` Could not match: ${skipped.slice(0, 8).join(", ")}.` : " All selected images were matched."}`);
            } catch (err) { setAdminMessage(err instanceof Error ? err.message : "Bulk image upload failed."); }
            finally { setBusy(false); e.target.value = ""; }
          }} />
        </details>
        <details className="mt-3 rounded-xl border border-amber-200 bg-white p-3"><summary className="cursor-pointer text-sm font-bold text-amber-950">Advanced: create a new resource manually</summary>
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
        </details>
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
          <div className="mt-4"><ResourceVisual title={detail.title} category={detail.category} imageUrl={detail.imageUrl} large /></div>
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
            <button onClick={printResource} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold"><Printer className="h-4 w-4" /> Print resource</button>
          </div>
          {<p className="mt-3 flex items-center gap-2 text-xs text-amber-800"><ShieldCheck className="h-4 w-4" /> Viewing is free for everyone. Active Giga3 AI subscribers can download and print these materials.</p>}
          {notice && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
        </>}
      </section>}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-black text-slate-950">Explore learning resources</h2><span className="text-xs text-slate-500">{resources?.length ?? 0} resources</span></div>
        {resources === undefined ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Loading resource library…</p> :
          resources.length === 0 ? <div className="rounded-2xl border border-dashed p-7 text-center"><BookOpen className="mx-auto h-8 w-8 text-violet-500" /><h3 className="mt-2 font-bold">No matching resources yet</h3><p className="mt-1 text-sm text-slate-500">Try another subject or search term. New approved practical guides will appear here.</p></div> :
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{resources.map(r => <article key={r._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-800">{r.subject}</span><span className="text-xs font-bold text-emerald-700">Free viewing</span></div><div className="mt-3"><ResourceVisual title={r.title} category={r.category} imageUrl={r.imageUrl} /></div><h3 className="mt-3 font-extrabold text-slate-950">{r.title}</h3><p className="mt-1 text-sm leading-5 text-slate-600">{r.summary}</p><p className="mt-3 text-xs text-slate-500">{r.classes.join(" · ")} · {r.category}</p><button onClick={() => {setSelected(r.slug);setNotice("");}} className="mt-4 min-h-11 w-full rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white">Open full material & illustration</button></article>)}</div>}
      </section>
      <style jsx global>{`@media print { body * { visibility: hidden !important; } .print-resource, .print-resource * { visibility: visible !important; } .print-resource { position: absolute; inset: 0; width: 100%; border: 0 !important; box-shadow: none !important; } .print-resource button, .print-resource a { display: none !important; } }`}</style>
    </main>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return <div><h3 className="text-sm font-extrabold text-slate-900">{title}</h3><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-5 text-slate-700">{items.map((item, i) => <li key={i}>{item}</li>)}</ol></div>;
}
