"use client";

import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { scienceDiagramFor } from "@/lib/gigalearn/scienceDiagrams";
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

function ResourceVisual({ slug, title, category, imageUrl, large = false }: {
  slug: string; title: string; category: string; imageUrl?: string | null; large?: boolean;
}) {
  const [zoomed, setZoomed] = useState(false);
  const diagram = scienceDiagramFor(slug);
  const commons = useCommonsImage(title, category, !diagram && !imageUrl && category !== "Laboratory Set-ups");
  const resolvedImage = diagram?.src || imageUrl || commons?.thumb;
  const visual = resolvedImage
    ? <img src={resolvedImage} alt={diagram?.alt ?? ("Learning aid: " + title)} className="block h-full w-full bg-white object-contain" loading="lazy" />
    : <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 rounded-2xl bg-violet-50 p-5 text-center" role="status">
        <span className="text-sm font-semibold text-violet-950">Illustration not yet available</span>
        <span className="text-xs leading-5 text-violet-800">The correct diagram for {title} has not been verified. Read the material while the illustration is being prepared.</span>
      </div>;
  return (
    <>
      <div className={"mx-auto w-full " + (large ? "max-w-[420px]" : "max-w-[260px]")}>
        {resolvedImage ? (
          <button type="button" onClick={() => setZoomed(true)} aria-label={"Zoom illustration for " + title} className="block w-full overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-violet-300">
            <div className="aspect-[9/16] w-full">{visual}</div>
          </button>
        ) : <div className="rounded-2xl border border-violet-200">{visual}</div>}
        {resolvedImage ? <button type="button" onClick={() => setZoomed(true)} className="mt-2 w-full rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-semibold text-violet-900">Zoom illustration</button> : null}
      </div>
      {commons && !diagram && !imageUrl && category !== "Laboratory Set-ups" && <div className="mx-auto mt-1 max-w-[420px] text-[10px] leading-4 text-slate-600">
        Photo: {commons.artist} · {commons.license} · <a href={commons.page} target="_blank" rel="noreferrer" className="font-semibold text-violet-800 underline">Source & licence</a>
        {" · "}<a href={commons.original} target="_blank" rel="noreferrer" download className="font-semibold text-violet-800 underline">Download original</a>
      </div>}
      {zoomed && resolvedImage && <div role="dialog" aria-modal="true" aria-label={"Zoomed learning diagram: " + title} className="fixed inset-0 z-[100] flex items-center justify-center overflow-auto bg-slate-950/95 p-3" onClick={() => setZoomed(false)}>
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
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [adminTitle, setAdminTitle] = useState("");
  const [adminSubject, setAdminSubject] = useState("Integrated Science");
  const [adminSummary, setAdminSummary] = useState("");
  const [adminImage, setAdminImage] = useState<File | null>(null);
  const [adminImagePreview, setAdminImagePreview] = useState("");
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
          <button type="button" aria-pressed={activeCollection === "Laboratory Equipment"} onClick={()=>{setActiveCollection("Laboratory Equipment");setSearch("");setLevel("all");setClassName("all");setCategory("Laboratory Equipment");setSubject("all");setSelected(null);setNotice("");window.setTimeout(()=>document.getElementById("resource-results")?.scrollIntoView({behavior:"smooth",block:"start"}),80);}} className={"rounded-xl px-3 py-3 text-left text-sm font-bold shadow-sm ring-2 ring-offset-1 " + (activeCollection === "Laboratory Equipment" ? "bg-violet-100 text-violet-950 ring-violet-500" : "bg-white text-violet-900 ring-transparent")}>🧪 Laboratory equipment <span className="block text-xs font-normal text-slate-600">JHS & SHS apparatus · Open collection</span></button>
          <button type="button" aria-pressed={activeCollection === "Laboratory Set-ups"} onClick={()=>{setActiveCollection("Laboratory Set-ups");setSearch("");setLevel("all");setClassName("all");setCategory("Laboratory Set-ups");setSubject("all");setSelected(null);setNotice("");window.setTimeout(()=>document.getElementById("resource-results")?.scrollIntoView({behavior:"smooth",block:"start"}),80);}} className={"rounded-xl px-3 py-3 text-left text-sm font-bold shadow-sm ring-2 ring-offset-1 " + (activeCollection === "Laboratory Set-ups" ? "bg-violet-100 text-violet-950 ring-violet-500" : "bg-white text-violet-900 ring-transparent")}>⚗️ JHS laboratory set-ups <span className="block text-xs font-normal text-slate-600">Practical arrangements · Open collection</span></button>
          <button type="button" aria-pressed={activeCollection === "Human Biology"} onClick={()=>{setActiveCollection("Human Biology");setSearch("");setLevel("all");setClassName("all");setCategory("Human Biology");setSubject("all");setSelected(null);setNotice("");window.setTimeout(()=>document.getElementById("resource-results")?.scrollIntoView({behavior:"smooth",block:"start"}),80);}} className={"rounded-xl px-3 py-3 text-left text-sm font-bold shadow-sm ring-2 ring-offset-1 " + (activeCollection === "Human Biology" ? "bg-violet-100 text-violet-950 ring-violet-500" : "bg-white text-violet-900 ring-transparent")}>🫀 9 human body systems <span className="block text-xs font-normal text-slate-600">Organs, labels and functions · Open collection</span></button>
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
                const normalise = (value: string) => value.toLowerCase().replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/g, "");
                const fileKey = normalise(file.name);
                const resource = listAdmin.find((r: any) => normalise(r.slug) === fileKey || normalise(r.title) === fileKey);
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
        <form className="mt-3 grid gap-3" onSubmit={async e => {
          e.preventDefault();
          if (!sessionToken || !adminImage) { setAdminMessage("Choose one image before saving."); return; }
          setBusy(true); setAdminMessage("");
          try {
            const slug = adminTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            const resourceId = await createResource({
              sessionToken, slug, title: adminTitle.trim(), summary: adminSummary.trim(),
              description: adminSummary.trim(), subject: adminSubject, levelBand: "jhs",
              classes: ["JHS 1", "JHS 2", "JHS 3"], topic: "General learning material",
              category: "Teaching Aid", activity: "", componentsJson: "[]",
              instructionsJson: "[]", activitiesJson: "[]", safetyJson: "[]",
              mistakesJson: "[]", studentExercises: "", previewText: adminSummary.trim(),
              access: "free", status: "draft",
            });
            const uploadUrl = await createUploadUrl({ sessionToken });
            const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": adminImage.type }, body: adminImage });
            if (!response.ok) throw new Error("Image upload failed. Please try again.");
            const { storageId } = await response.json();
            await attachFile({ sessionToken, resourceId, fileKind: "image", storageId });
            setAdminMessage("Resource saved and image attached. It is now in the review queue.");
            setAdminTitle(""); setAdminSummary(""); setAdminImage(null); setAdminImagePreview("");
            const picker = document.getElementById("learning-resource-image") as HTMLInputElement | null;
            if (picker) picker.value = "";
          } catch (error) { setAdminMessage(error instanceof Error ? error.message : "Could not save the resource."); }
          finally { setBusy(false); }
        }}>
          <input required value={adminTitle} onChange={e => setAdminTitle(e.target.value)} placeholder="Resource name" aria-label="Resource name" className="min-h-12 rounded-xl border border-amber-300 bg-white px-3 text-base text-slate-950 placeholder:text-slate-500" />
          <select value={adminSubject} onChange={e => setAdminSubject(e.target.value)} aria-label="Subject" className="min-h-12 rounded-xl border border-amber-300 bg-white px-3 text-base text-slate-950">{SUBJECTS.map(subjectName => <option key={subjectName}>{subjectName}</option>)}</select>
          <textarea required value={adminSummary} onChange={e => setAdminSummary(e.target.value)} placeholder="Short description" aria-label="Short description" rows={3} className="rounded-xl border border-amber-300 bg-white p-3 text-base text-slate-950 placeholder:text-slate-500" />
          <label className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm font-bold text-violet-950">
            One learning-aid image (JPG, PNG or WebP)
            <input id="learning-resource-image" required type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm" onChange={e => {
              const file = e.target.files?.[0] ?? null;
              setAdminImage(file); setAdminImagePreview(file ? URL.createObjectURL(file) : "");
            }} />
          </label>
          {adminImagePreview && <div className="rounded-xl border border-violet-200 bg-white p-2"><img src={adminImagePreview} alt="Selected learning aid preview" className="mx-auto max-h-64 w-auto rounded-lg object-contain" /><p className="mt-1 text-center text-xs text-slate-600">{adminImage?.name}</p></div>}
          <button type="submit" disabled={busy || !adminImage || !adminTitle.trim() || !adminSummary.trim()} className="min-h-12 rounded-xl bg-violet-800 px-4 text-base font-bold text-white disabled:opacity-50">{busy ? "Saving resource and image…" : "Save resource with image"}</button>
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
        </details>
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
          <div className="mt-4"><ResourceVisual slug={detail.slug} title={detail.title} category={detail.category} imageUrl={detail.imageUrl} large /></div>
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
          resources.length === 0 ? <div className="rounded-2xl border border-dashed p-7 text-center"><BookOpen className="mx-auto h-8 w-8 text-violet-500" /><h3 className="mt-2 font-bold">No matching resources yet</h3><p className="mt-1 text-sm text-slate-500">This collection has no published resources yet. Please contact the administrator to publish the science learning aids.</p></div> :
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{resources.map(r => <article key={r._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-800">{r.subject}</span><span className="text-xs font-bold text-emerald-700">Free viewing</span></div><div className="mt-3"><ResourceVisual slug={r.slug} title={r.title} category={r.category} imageUrl={r.imageUrl} /></div><h3 className="mt-3 font-extrabold text-slate-950">{r.title}</h3><p className="mt-1 text-sm leading-5 text-slate-600">{r.summary}</p><p className="mt-3 text-xs text-slate-500">{r.classes.join(" · ")} · {r.category}</p><button onClick={() => {setSelected(r.slug);setNotice("");}} className="mt-4 min-h-11 w-full rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white">Open full material & illustration</button></article>)}</div>}
      </section>
      <style jsx global>{`@media print { body * { visibility: hidden !important; } .print-resource, .print-resource * { visibility: visible !important; } .print-resource { position: absolute; inset: 0; width: 100%; border: 0 !important; box-shadow: none !important; } .print-resource button, .print-resource a { display: none !important; } }`}</style>
    </main>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return <div><h3 className="text-sm font-extrabold text-slate-900">{title}</h3><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-5 text-slate-700">{items.map((item, i) => <li key={i}>{item}</li>)}</ol></div>;
}
