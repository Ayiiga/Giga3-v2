"use client";

import { useEffect, useState } from "react";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";

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
  const saveSettings = useMutation(api.gigaSeo.updateSettings);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

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
    setBusy(true);
    setMessage("");
    try {
      await saveSettings({ ...adminCreds, ...settings });
      setMessage("GigaSEO AI settings saved. Automation remains off unless you enable it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }

  if (overview === undefined) {
    return <section className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted">Loading GigaSEO AI…</p></section>;
  }
  if (overview === null) {
    return <section className="rounded-2xl border bg-card p-5"><p className="text-sm text-red-700">GigaSEO AI access denied.</p></section>;
  }
  if (!settings) {
    return <section className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted">Preparing GigaSEO AI settings…</p></section>;
  }

  return (
    <section className="space-y-5 rounded-2xl border border-sky-200 bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">SEO operations</p>
          <h2 className="mt-1 text-xl font-bold">GigaSEO AI</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">Research, plan and prepare search-focused articles for the Giga3 AI blog.</p>
        </div>
        <span className={settings.enabled ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800" : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"}>
          {settings.enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Keyword ideas", overview.keywordCount],
          ["New keywords", overview.newKeywordCount],
          ["Content plans", overview.contentPlanCount],
          ["Published", overview.publishedCount],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border p-3">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Publishing frequency
          <select className="mt-1 block w-full rounded-xl border bg-background p-3" value={settings.articlesPerWeek} onChange={(e) => setSettings({ ...settings, articlesPerWeek: Number(e.target.value) })}>
            {[1,2,3,4,5,6,7].map((n) => <option key={n} value={n}>{n} article{n === 1 ? "" : "s"} per week</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Target market
          <select className="mt-1 block w-full rounded-xl border bg-background p-3" value={settings.targetMarket} onChange={(e) => setSettings({ ...settings, targetMarket: e.target.value as Settings["targetMarket"] })}>
            <option value="ghana_only">Ghana only</option>
            <option value="ghana_international">Ghana + International</option>
            <option value="africa_international">Africa + International</option>
          </select>
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Publishing permission
          <select className="mt-1 block w-full rounded-xl border bg-background p-3" value={settings.publishingPermission} onChange={(e) => setSettings({ ...settings, publishingPermission: e.target.value as Settings["publishingPermission"] })}>
            <option value="human_approval">Require human approval before publishing</option>
            <option value="automatic_after_quality_checks">Automatic publishing after quality checks</option>
          </select>
        </label>
      </div>

      <div>
        <p className="text-sm font-semibold">Content priorities</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {DEFAULT_PRIORITIES.map((priority) => (
            <li key={priority} className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={settings.contentPriorities.includes(priority)} onChange={(e) => setSettings({ ...settings, contentPriorities: e.target.checked ? [...settings.contentPriorities, priority] : settings.contentPriorities.filter((item) => item !== priority) })} />
              <span>{priority}</span>
            </li>
          ))}
        </ul>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
        <input type="checkbox" className="mt-1" checked={settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} />
        <span><strong>Enable GigaSEO AI operations.</strong><br />This Phase 1 switch stores the preference only. Research jobs, AI generation and publishing are not yet connected.</span>
      </label>

      {message && <p role="status" className="text-sm text-muted">{message}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void save()} disabled={busy || settings.contentPriorities.length === 0} className="rounded-xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Saving…" : "Save GigaSEO settings"}
        </button>
        <p className="text-xs text-muted">No articles are published by this Phase 1 setup.</p>
      </div>
    </section>
  );
}
