"use client";

import { CreatorResultPanel } from "@/components/creator-studio/CreatorResultPanel";
import { Button } from "@/components/ui/Button";
import { useGigaLearnGeneration } from "@/hooks/useGigaLearnGeneration";
import {
  CURRICULUM_LEVELS,
  CURRICULUM_SUBJECTS,
  getLevel,
  getSubject,
} from "@/lib/gigalearn/curriculumEngine";
import { aiStudioImageUrl, shortVideoScript, socialGraphicUrl } from "@/lib/gigalearn/ecosystem";
import { saveTeleprompterScript } from "@/lib/gigasocial/teleprompterScripts";
import { buildRepurposePrompt, repurposeTargetsFor } from "@/lib/gigalearn/repurpose";
import { parseResourceSearch, scoreResource } from "@/lib/gigalearn/resourceSearch";
import {
  getStudioContext,
  studioContextIds,
  type StudioContext,
} from "@/lib/gigalearn/studioContext";
import {
  getTeacherAnalytics,
  listArtifacts,
  removeArtifact,
  toggleArtifactFavorite,
  type LearningArtifact,
  type ResourceType,
} from "@/lib/gigalearn/workspace";
import { copyMarkdownToClipboard, shareText } from "@/lib/share/clientShare";
import { cn } from "@/lib/utils";
import { ChevronDown, Copy, Printer, Search, Share2, Star, Trash2 } from "lucide-react";
import { memo, useMemo, useState } from "react";
const RESOURCE_TYPE_LABELS: Array<{ id: ResourceType | "all"; label: string }> = [
  { id: "all", label: "All types" },
  { id: "lesson", label: "Lessons" },
  { id: "notes", label: "Notes" },
  { id: "quiz", label: "Quizzes" },
  { id: "assignment", label: "Assignments" },
  { id: "worksheet", label: "Worksheets" },
  { id: "assessment", label: "Assessments" },
  { id: "presentation", label: "Presentations" },
  { id: "video", label: "Videos" },
  { id: "practical", label: "Practical / Projects" },
  { id: "flashcard", label: "Flashcards" },
  { id: "revision", label: "Revision" },
  { id: "study-plan", label: "Study plans" },
];

type DateFilter = "any" | "today" | "week" | "month";

function matchesDate(createdAt: number, filter: DateFilter): boolean {
  if (filter === "any") return true;
  const now = new Date();
  const d = new Date(createdAt);
  if (filter === "today") return d.toDateString() === now.toDateString();
  const days = filter === "week" ? 7 : 30;
  return now.getTime() - createdAt < days * 24 * 60 * 60 * 1000;
}

function artifactSubjectId(a: LearningArtifact): string {
  return (a.curriculumIds?.subjectId ?? "").toLowerCase();
}

function artifactLevelId(a: LearningArtifact): string {
  return (a.curriculumIds?.levelId ?? "").toLowerCase();
}

function artifactCurriculumId(a: LearningArtifact): string {
  return (a.curriculumIds?.curriculumId ?? "").toLowerCase();
}

export const ResourceLibrary = memo(function ResourceLibrary() {
  const [artifacts, setArtifacts] = useState<LearningArtifact[]>(() => listArtifacts());
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [curriculumFilter, setCurriculumFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<ResourceType | "all">("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("any");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [repurposing, setRepurposing] = useState<LearningArtifact | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const generation = useGigaLearnGeneration();
  const [analytics, setAnalytics] = useState(() => getTeacherAnalytics());
  const parsedSearch = useMemo(() => parseResourceSearch(search.trim()), [search]);

  function refresh() {
    setArtifacts(listArtifacts());
    setAnalytics(getTeacherAnalytics());
  }

  const visible = useMemo(() => {
    const q = search.trim();
    let list = artifacts.filter((a) => {
      if (favoritesOnly && !a.favorite) return false;
      if (subjectFilter !== "all" && artifactSubjectId(a) !== subjectFilter) {
        // Fall back to legacy display-name matching for pre-Phase-2 saves.
        const label = (a.subject ?? "").toLowerCase();
        const wanted = getSubject(subjectFilter)?.label.toLowerCase() ?? "";
        if (!wanted || !label.includes(wanted.slice(0, 8))) return false;
      }
      if (gradeFilter !== "all" && artifactLevelId(a) !== gradeFilter) return false;
      if (curriculumFilter !== "all" && artifactCurriculumId(a) !== curriculumFilter) return false;
      if (typeFilter !== "all" && (a.resourceType ?? "other") !== typeFilter) return false;
      if (!matchesDate(a.createdAt, dateFilter)) return false;
      return true;
    });
    if (q) {
      list = list
        .map((a) => ({
          a,
          score:
            scoreResource(parsedSearch, {
              id: a.id,
              title: a.title,
              content: a.content,
              kind: a.kind,
              toolId: a.toolId,
              subjectId: artifactSubjectId(a) || undefined,
              levelId: artifactLevelId(a) || undefined,
              topic: a.curriculumIds?.topic ?? a.topic,
              curriculumId: artifactCurriculumId(a) || undefined,
              subject: a.subject,
              level: a.level,
              curriculum: a.curriculum,
              createdAt: a.createdAt,
            }) + ((a.title + a.content).toLowerCase().includes(q.toLowerCase()) ? 2 : 0),
        }))
        .filter((e) => e.score > 0)
        .sort((x, y) => y.score - x.score)
        .map((e) => e.a);
    }
    return list;
  }, [artifacts, favoritesOnly, subjectFilter, gradeFilter, curriculumFilter, typeFilter, dateFilter, search, parsedSearch]);

  async function handleShare(a: LearningArtifact) {
    const res = await shareText({ title: a.title, text: a.content.slice(0, 8000) });
    setFeedback(res.ok ? "Shared." : (res.reason ?? "Could not share."));
    window.setTimeout(() => setFeedback(null), 2500);
  }

  function handleExport(a: LearningArtifact) {
    const blob = new Blob([`# ${a.title}\n\n${a.content}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `${a.toolId}-${a.id}.md`;
    document.body.appendChild(el);
    el.click();
    el.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function handlePrint(a: LearningArtifact) {
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) {
      setFeedback("Popup blocked — allow popups to print, or use Export.");
      window.setTimeout(() => setFeedback(null), 3000);
      return;
    }
    win.document.write(
      `<html><head><title>${a.title.replace(/</g, "&lt;")}</title></head><body><h1>${a.title.replace(/</g, "&lt;")}</h1><pre style="white-space:pre-wrap;font-family:sans-serif">${a.content.replace(/</g, "&lt;")}</pre><script>window.onload=()=>window.print()</script></body></html>`
    );
    win.document.close();
  }

  function handleRepurpose(a: LearningArtifact, targetId: Parameters<typeof buildRepurposePrompt>[0]["targetId"]) {
    const stored: StudioContext = getStudioContext();
    const context: StudioContext = {
      ...stored,
      ...(a.curriculumIds?.countryId ? { countryId: a.curriculumIds.countryId } : {}),
      ...(a.curriculumIds?.curriculumId ? { curriculumId: a.curriculumIds.curriculumId } : {}),
      ...(a.curriculumIds?.levelId ? { levelId: a.curriculumIds.levelId } : {}),
      ...(a.curriculumIds?.subjectId ? { subjectId: a.curriculumIds.subjectId } : {}),
      ...(a.curriculumIds?.strand ? { strand: a.curriculumIds.strand } : {}),
      ...(a.curriculumIds?.subStrand ? { subStrand: a.curriculumIds.subStrand } : {}),
      ...(a.curriculumIds?.topic ?? a.topic ? { topic: a.curriculumIds?.topic ?? a.topic ?? "" } : {}),
    };
    const { prompt, backendToolId } = buildRepurposePrompt({
      sourceLabel: a.title,
      targetId,
      sourceContent: a.content,
      context,
    });
    const ids = studioContextIds(context);
    setRepurposing(a);
    void generation.run({
      toolId: backendToolId,
      prompt,
      curriculum: a.curriculum,
      subject: a.subject,
      level: a.level,
      curriculumIds: {
        countryId: ids.countryId,
        curriculumId: ids.curriculumId,
        levelId: ids.levelId,
        gradeId: ids.gradeId,
        subjectId: ids.subjectId,
        strand: ids.strand || undefined,
        subStrand: ids.subStrand || undefined,
        topic: ids.topic || undefined,
      },
      title: `Repurposed: ${a.title}`,
    });
  }

  return (
    <div className="space-y-4">
      {/* Teacher analytics (own data only). */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Teaching analytics">
        <StatCard label="Resources created" value={String(analytics.resourcesCreated)} />
        <StatCard label="Quizzes created" value={String(analytics.quizzesCreated)} />
        <StatCard label="Assignments created" value={String(analytics.assignmentsCreated)} />
        <StatCard label="Lessons created" value={String(analytics.lessonsCreated)} />
      </section>
      {(analytics.mostUsedSubjects.length > 0 || analytics.mostUsedTopics.length > 0) && (
        <section className="saas-card rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Most used</h3>
          {analytics.mostUsedSubjects.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              Subjects:{" "}
              {analytics.mostUsedSubjects
                .map((s) => `${getSubject(s.subjectId)?.label ?? s.subjectId} (${s.count})`)
                .join(", ")}
            </p>
          )}
          {analytics.mostUsedTopics.length > 0 && (
            <p className="mt-1 text-xs text-muted">
              Topics:{" "}
              {analytics.mostUsedTopics
                .slice(0, 5)
                .map((t) => `${t.topic || t.subjectId} (${t.count})`)
                .join(", ")}
            </p>
          )}
        </section>
      )}

      {/* Curriculum-aware search */}
      <div>
        <label htmlFor="gl-library-search" className="mb-1.5 block text-xs font-medium text-muted">
          Search your library
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="gl-library-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Try "JHS 2 Career Technology materials"…'
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none ring-accent/20 focus:ring-2"
          />
        </div>
        {search.trim() && (parsedSearch.subjectId || parsedSearch.levelId) && (
          <p className="mt-1.5 text-xs text-muted" role="note">
            Understood:
            {parsedSearch.levelId ? ` ${getLevel(parsedSearch.levelId)?.label}` : ""}
            {parsedSearch.subjectId ? ` · ${getSubject(parsedSearch.subjectId)?.label}` : ""}
            {parsedSearch.topicKeywords.length ? ` · about ${parsedSearch.topicKeywords.join(" ")}` : ""}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="gl-library-subject" className="mb-1.5 block text-xs font-medium text-muted">Subject</label>
          <select
            id="gl-library-subject"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="all">All subjects</option>
            {CURRICULUM_SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="gl-library-grade" className="mb-1.5 block text-xs font-medium text-muted">Grade</label>
          <select
            id="gl-library-grade"
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="all">All grades</option>
            {CURRICULUM_LEVELS.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="gl-library-curriculum" className="mb-1.5 block text-xs font-medium text-muted">Curriculum</label>
          <select
            id="gl-library-curriculum"
            value={curriculumFilter}
            onChange={(e) => setCurriculumFilter(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="all">All curricula</option>
            <option value="gh-ccp">Common Core Programme</option>
            <option value="gh-shs">SHS / SHTS / STEM Curriculum</option>
          </select>
        </div>
        <div>
          <label htmlFor="gl-library-type" className="mb-1.5 block text-xs font-medium text-muted">Content type</label>
          <select
            id="gl-library-type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ResourceType | "all")}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
          >
            {RESOURCE_TYPE_LABELS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="gl-library-date" className="mb-1.5 block text-xs font-medium text-muted">Date</label>
          <select
            id="gl-library-date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="any">Any time</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((v) => !v)}
            className={cn(
              "min-h-11 rounded-full border px-4 py-2 text-sm font-medium",
              favoritesOnly ? "border-accent/40 bg-accent/10 text-foreground" : "border-border text-muted"
            )}
          >
            ★ Favorites only
          </button>
        </div>
      </div>

      {feedback && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900" role="status">
          {feedback}
        </p>
      )}

      {repurposing && (generation.phase !== "idle" || generation.result) && (
        <section className="space-y-3 rounded-2xl border border-accent/25 bg-accent/5 p-4" aria-live="polite">
          <h3 className="text-sm font-semibold text-foreground">Repurposing: {repurposing.title}</h3>
          <CreatorResultPanel
            content={generation.result}
            loading={generation.loading}
            error={generation.error}
            onRegenerate={() => void generation.regenerate()}
          />
          <Button type="button" size="sm" variant="secondary" className="min-h-9" onClick={() => { generation.clear(); setRepurposing(null); }}>
            Close
          </Button>
        </section>
      )}

      <p className="text-xs text-muted" aria-live="polite">
        {visible.length} of {artifacts.length} resources
      </p>

      {visible.length === 0 ? (
        <div className="saas-card rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium text-foreground">No resources match these filters</p>
          <p className="mt-1 text-sm text-muted">
            {artifacts.length === 0
              ? "Generate a lesson, quiz or worksheet in Teacher Studio — it will be saved here automatically."
              : "Try clearing a filter or searching for something else."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((a) => {
            const isOpen = expanded === a.id;
            const subjectLabel = a.curriculumIds?.subjectId
              ? (getSubject(a.curriculumIds.subjectId)?.label ?? a.subject)
              : a.subject;
            return (
              <li key={a.id} className="saas-card rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {a.title}
                      {a.favorite && <span className="ml-1 text-amber-500" aria-label="favorite">★</span>}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {new Date(a.createdAt).toLocaleString()} · {a.resourceType ?? a.kind}
                      {subjectLabel ? ` · ${subjectLabel}` : ""}
                      {a.curriculumIds?.gradeId ? ` · ${a.curriculumIds.gradeId}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button type="button" size="sm" variant="ghost" className="min-h-9" onClick={() => setExpanded(isOpen ? null : a.id)} aria-expanded={isOpen}>
                      <ChevronDown className={cn("h-4 w-4", isOpen && "rotate-180")} aria-hidden />
                      {isOpen ? "Hide" : "View"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="min-h-9" aria-label={`Copy ${a.title}`} onClick={() => void copyMarkdownToClipboard(a.content)}>
                      <Copy className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="min-h-9" aria-label={`Share ${a.title}`} onClick={() => void handleShare(a)}>
                      <Share2 className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="min-h-9" aria-label={`Print ${a.title}`} onClick={() => handlePrint(a)}>
                      <Printer className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="min-h-9"
                      aria-label={a.favorite ? `Remove ${a.title} from favorites` : `Save ${a.title} to favorites`}
                      onClick={() => {
                        toggleArtifactFavorite(a.id);
                        refresh();
                      }}
                    >
                      <Star className={cn("h-4 w-4", a.favorite && "fill-amber-400 text-amber-500")} aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="min-h-9"
                      aria-label={`Delete ${a.title}`}
                      onClick={() => {
                        removeArtifact(a.id);
                        refresh();
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
                {isOpen && (
                  <div className="mt-3 space-y-3">
                    <p className="whitespace-pre-wrap text-sm text-foreground">{a.content}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" className="min-h-9" onClick={() => handleExport(a)}>
                        Export
                      </Button>
                      <RepurposeMenu
                        toolId={a.toolId}
                        onSelect={(targetId) => handleRepurpose(a, targetId)}
                      />
                    </div>
                    <EcosystemMoves artifact={a} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});

function EcosystemMoves({ artifact }: { artifact: LearningArtifact }) {
  function openImage() {
    const topic = artifact.curriculumIds?.topic ?? artifact.topic ?? artifact.title;
    const subject = artifact.curriculumIds?.subjectId
      ? (getSubject(artifact.curriculumIds.subjectId)?.label ?? "")
      : (artifact.subject ?? "");
    const grade = artifact.curriculumIds?.levelId
      ? (getLevel(artifact.curriculumIds.levelId)?.label ?? "")
      : (artifact.level ?? "");
    window.open(aiStudioImageUrl(topic, subject, grade), "_blank", "noopener");
  }
  function openGraphic() {
    window.open(socialGraphicUrl(artifact.title), "_blank", "noopener");
  }
  function openVideo(short: boolean) {
    const topic = artifact.curriculumIds?.topic ?? artifact.topic ?? artifact.title;
    saveTeleprompterScript(short ? shortVideoScript(artifact.content, topic) : artifact.content.slice(0, 6000));
    window.open("/gigaedit", "_blank", "noopener");
  }
  return (
    <div className="flex flex-wrap gap-2" aria-label="Send to Giga3 ecosystem">
      <Button type="button" size="sm" variant="ghost" className="min-h-9" onClick={openImage}>
        AI Studio image
      </Button>
      <Button type="button" size="sm" variant="ghost" className="min-h-9" onClick={() => openVideo(false)}>
        GigaEdits video
      </Button>
      <Button type="button" size="sm" variant="ghost" className="min-h-9" onClick={openGraphic}>
        Social graphic
      </Button>
      <Button type="button" size="sm" variant="ghost" className="min-h-9" onClick={() => openVideo(true)}>
        Short video script
      </Button>
    </div>
  );
}

function RepurposeMenu({
  toolId,
  onSelect,
}: {
  toolId: string;
  onSelect: (targetId: Parameters<typeof buildRepurposePrompt>[0]["targetId"]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="min-h-9"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        Repurpose
        <ChevronDown className={cn("h-4 w-4", open && "rotate-180")} aria-hidden />
      </Button>
      {open && (
        <div role="menu" aria-label="Repurpose into" className="absolute z-20 mt-2 w-64 rounded-2xl border border-border bg-white p-2 shadow-lg">
          {repurposeTargetsFor(toolId).map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSelect(t.id);
              }}
              className="flex min-h-11 w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-accent/5"
            >
              <span className="text-sm font-medium text-foreground">{t.label}</span>
              <span className="text-xs text-muted">{t.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="saas-card rounded-2xl border border-border px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
