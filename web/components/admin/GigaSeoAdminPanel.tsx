"use client";

import { useEffect, useState } from "react";
import { api } from "convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import type { Id } from "convex/_generated/dataModel";

type AdminCredentials = { adminSessionToken?: string; adminKey?: string };
type Settings = {
  enabled: boolean;
  articlesPerWeek: number;
  publishingPermission: "human_approval" | "automatic_after_quality_checks";
  targetMarket: "ghana_only" | "ghana_international" | "africa_international";
  contentPriorities: string[];
};

const DEFAULT_PRIORITIES = [
  "AI tools and tutorials",
  "Ghana education and examination preparation",
  "STEM, robotics and digital skills",
  "Teacher development and professional learning",
  "African technology and innovation",
];

export function GigaSeoAdminPanel({ adminCreds }: { adminCreds: AdminCredentials }) {
  const overview = useQuery(api.gigaSeo.getAdminOverview, adminCreds);
  const ideas = useQuery(api.gigaSeo.listKeywordIdeas, { ...adminCreds, limit: 16 });
  const plans = useQuery(api.gigaSeo.listContentPlans, { ...adminCreds, limit: 12 });
  const saveSettings = useMutation(api.gigaSeo.updateSettings);
  const createPlan = useMutation(api.gigaSeo.createContentPlan);
  const approveDraft = useMutation(api.gigaSeo.approveDraft);
  const research = useAction(api.gigaSeo.researchKeywords);
  const generateDraft = useAction(api.gigaSeo.generateDraft);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("Ghanaian students, teachers and small businesses");
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("Ghana + International");

  useEffect(() => {
    if (overview?.settings) {
      setSettings({
        enabled: overview.settings.enabled,
        articlesPerWeek: overview.settings.articlesPerWeek,
        publishingPermission: overview.settings.publishingPermission,
        targetMarket: overview.settings.targetMarket,
        contentPriorities: overview.settings.contentPriorities,
      });
    }
  }, [overview]);

  async function save() {
    if (!settings) return;
    setBusy(true); setMessage("");
    try {
      await saveSettings({ ...adminCreds, ...settings });
      setMessage("Settings saved. Publishing remains approval-gated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save settings.");
    } finally { setBusy(false); }
  }

  async function runResearch() {
    setBusy(true); setMessage("");
    try {
      const result = await research({ ...adminCreds, topic, market: selectedMarket, audience });
      setMessage(`Generated and saved ${result.saved} AI keyword ideas. Search volume and difficulty are not fabricated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Keyword research failed.");
    } finally { setBusy(false); }
  }

  async function makePlan(keyword: string) {
    setBusy(true); setMessage("");
    try {
      const title = keyword.charAt(0).toUpperCase() + keyword.slice(1) + ": A Practical Guide";
      await createPlan({ ...adminCreds, title, primaryKeyword: keyword, market: selectedMarket, audience });
      setMessage("Content plan created. Generate its first draft from the editorial queue.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create content plan.");
    } finally { setBusy(false); }
  }

  async function approve(planId: Id<"gigaSeoContentPlans">) {
    setBusy(true); setMessage("");
    try { await approveDraft({ ...adminCreds, planId }); setMessage("Draft approved for the next publishing stage. It has not been published."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not approve draft."); }
    finally { setBusy(false); }
  }

  async function makeDraft(planId: Id<"gigaSeoContentPlans">) {
    setDrafting(String(planId)); setMessage("");
    try {
      const result = await generateDraft({ ...adminCreds, planId });
      setMessage(`Draft generated: ${result.wordCount} words, quality score ${result.qualityScore}/100. Editorial review is required.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Draft generation failed.");
    } finally { setDrafting(null); }
  }

  if (overview === undefined || ideas === undefined || plans === undefined) {
    return <section className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted">Loading GigaSEO AI…</p></section>;
  }
  if (overview === null) {
    return <section className="rounded-2xl border bg-card p-5"><p className="text-sm text-red-700">GigaSEO AI access denied.</p></section>;
  }
  if (!settings) return <section className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted">Preparing settings…</p></section>;

  return (
    <section className="space-y-6 rounded-2xl border border-sky-200 bg-card p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-sky-700">SEO operations · Phase 2</p>
          <h2 className="mt-1 text-xl font-bold">GigaSEO AI</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">Research keyword opportunities, create editorial plans and prepare AI-assisted article drafts.</p>
        </div>
        <span className={settings.enabled ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800" : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"}>{settings.enabled ? "Enabled" : "Disabled"}</span>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {[["Keyword ideas", overview.keywordCount], ["Content plans", overview.contentPlanCount]].map(([label, value]) =>
          <div key={String(label)} className="rounded-xl border p-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <div><h3 className="font-semibold">1. Keyword intelligence</h3><p className="text-xs text-muted">AI-generated keyword candidates; not live search-volume or difficulty data.</p></div>
        <label className="block text-sm font-medium">Topic or seed keyword
          <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={180} placeholder="e.g. AI tools for teachers in Ghana" className="mt-1 block w-full rounded-xl border bg-background p-3" />
        </label>
        <label className="block text-sm font-medium">Target audience
          <input value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={160} className="mt-1 block w-full rounded-xl border bg-background p-3" />
        </label>
        <label className="block text-sm font-medium">Market
          <select value={selectedMarket} onChange={(e) => setSelectedMarket(e.target.value)} className="mt-1 block w-full rounded-xl border bg-background p-3">
            <option>Ghana only</option><option>Ghana + International</option><option>Africa + International</option>
          </select>
        </label>
        <button type="button" onClick={() => void runResearch()} disabled={busy || topic.trim().length < 3} className="rounded-xl bg-sky-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Working…" : "Generate keyword ideas"}</button>
        <div className="space-y-2">
          {(ideas ?? []).map((idea) => <div key={idea._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/30 p-3">
            <div className="min-w-0"><p className="text-sm font-semibold">{idea.keyword}</p><p className="text-xs text-muted">{idea.searchIntent ?? "Informational"} · AI suggestion</p>{idea.rationale && <p className="mt-1 text-xs text-muted">{idea.rationale}</p>}</div>
            <button type="button" onClick={() => void makePlan(idea.keyword)} disabled={busy} className="rounded-lg border px-3 py-2 text-xs font-semibold">Create plan</button>
          </div>)}
          {ideas.length === 0 && <p className="text-sm text-muted">No keyword ideas yet. Enter a topic to begin.</p>}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <div><h3 className="font-semibold">2. Editorial pipeline</h3><p className="text-xs text-muted">Generate drafts for review; this does not publish to the public blog.</p></div>
        {(plans ?? []).map((plan) => <article key={plan._id} className="space-y-2 rounded-lg bg-muted/30 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold">{plan.title}</p><p className="text-xs text-muted">{plan.primaryKeyword} · {plan.status.replace("_", " ")}</p></div>
            {typeof plan.qualityScore === "number" && <span className="text-xs font-semibold">{plan.qualityScore}/100</span>}</div>
          {plan.qualityIssues?.length ? <ul className="list-disc pl-5 text-xs text-muted">{plan.qualityIssues.map((issue, index) => <li key={index}>{issue}</li>)}</ul> : null}
          {plan.draftContent ? <details className="text-sm"><summary className="cursor-pointer font-medium">Preview generated draft</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs">{plan.draftContent}</pre></details> : null}
          {plan.status !== "quality_review" && plan.status !== "approved" && <button type="button" onClick={() => void makeDraft(plan._id)} disabled={drafting !== null} className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{drafting === String(plan._id) ? "Generating…" : "Generate article draft"}</button>}
          {plan.status === "quality_review" && <div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold text-amber-700">Review the draft and factual claims before approval.</p><button type="button" onClick={() => void approve(plan._id)} disabled={busy || (plan.qualityScore ?? 0) < 60} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50">Approve draft</button></div>}{plan.status === "approved" && <p className="text-xs font-semibold text-emerald-700">Approved · awaiting a separate publishing workflow.</p>}
        </article>)}
        {plans.length === 0 && <p className="text-sm text-muted">Your content plans will appear here.</p>}
      </div>

      <div className="space-y-4 border-t pt-4">
        <h3 className="font-semibold">3. Publishing and operating settings</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">Publishing frequency
            <select className="mt-1 block w-full rounded-xl border bg-background p-3" value={settings.articlesPerWeek} onChange={(e) => setSettings({ ...settings, articlesPerWeek: Number(e.target.value) })}>{[1,2,3,4,5,6,7].map((n) => <option key={n} value={n}>{n} article{n === 1 ? "" : "s"} per week</option>)}</select>
          </label>
          <label className="block text-sm font-medium">Target market
            <select className="mt-1 block w-full rounded-xl border bg-background p-3" value={settings.targetMarket} onChange={(e) => setSettings({ ...settings, targetMarket: e.target.value as Settings["targetMarket"] })}><option value="ghana_only">Ghana only</option><option value="ghana_international">Ghana + International</option><option value="africa_international">Africa + International</option></select>
          </label>
          <label className="block text-sm font-medium sm:col-span-2">Publishing permission
            <select className="mt-1 block w-full rounded-xl border bg-background p-3" value={settings.publishingPermission} onChange={(e) => setSettings({ ...settings, publishingPermission: e.target.value as Settings["publishingPermission"] })}><option value="human_approval">Require human approval before publishing</option><option value="automatic_after_quality_checks">Automatic after quality checks (not active in Phase 2)</option></select>
          </label>
        </div>
        <div><p className="text-sm font-semibold">Content priorities</p><ul className="mt-2 grid gap-2 sm:grid-cols-2">{DEFAULT_PRIORITIES.map((priority) => <li key={priority} className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={settings.contentPriorities.includes(priority)} onChange={(e) => setSettings({ ...settings, contentPriorities: e.target.checked ? [...settings.contentPriorities, priority] : settings.contentPriorities.filter((item) => item !== priority) })} /><span>{priority}</span></li>)}</ul></div>
        <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><input type="checkbox" className="mt-1" checked={settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} /><span><strong>Enable GigaSEO AI operations.</strong><br />Enables the admin operations preference only. No scheduled or automatic publishing is activated.</span></label>
        <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => void save()} disabled={busy || settings.contentPriorities.length === 0} className="rounded-xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save GigaSEO settings"}</button><p className="text-xs text-muted">Public blog publication remains manual.</p></div>
      </div>
      {message && <p role="status" className="rounded-lg bg-muted/40 p-3 text-sm">{message}</p>}
    </section>
  );
}
