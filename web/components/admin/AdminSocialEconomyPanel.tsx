"use client";

import { Button } from "@/components/ui/Button";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Settings2 } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";

const FIELD_LABELS: Record<string, string> = {
  "gigasocial.economy.minFans": "Minimum fans for earn tools (tips stay open)",
  "gigasocial.economy.viewRewardRate": "Content view reward (GHS per view)",
  "gigasocial.economy.watchTimeRate": "Video watch-time reward (GHS per minute)",
  "gigasocial.economy.engagementRate": "Engagement reward (GHS per comment/share)",
  "gigasocial.economy.giftSharePercent": "Creator gift share (%)",
  "gigasocial.economy.affiliatePercent": "Affiliate commission (%)",
  "gigasocial.economy.creditsToGhs": "Credits to GHS conversion rate",
  "gigasocial.economy.boostMinGhs": "Minimum boost budget (GHS)",
  "gigasocial.economy.boostMaxGhs": "Maximum boost budget (GHS)",
  "gigasocial.economy.boostDurations": "Boost durations (comma-separated days)",
};

export const AdminSocialEconomyPanel = memo(function AdminSocialEconomyPanel({
  adminCreds,
  onNotice,
  onError,
}: {
  adminCreds: { adminSessionToken: string };
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const entries = useQuery(api.remoteConfig.getEconomyConfigAdmin, adminCreds);
  const updateSetting = useMutation(api.remoteConfig.updateEconomyConfigAdmin);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!entries) return;
    const next: Record<string, string> = {};
    for (const entry of entries) {
      next[entry.key] = entry.value;
    }
    setDrafts(next);
  }, [entries]);

  const handleSave = useCallback(
    async (key: string) => {
      const value = drafts[key];
      if (value === undefined) return;
      setBusyKey(key);
      onError("");
      try {
        await updateSetting({ ...adminCreds, key, value });
        onNotice(`Updated ${FIELD_LABELS[key] ?? key}.`);
      } catch (e) {
        onError(e instanceof Error ? e.message : "Could not save setting.");
      } finally {
        setBusyKey(null);
      }
    },
    [adminCreds, drafts, onError, onNotice, updateSetting]
  );

  if (entries === undefined) {
    return <p className="text-sm text-muted">Loading GigaSocial economy settings…</p>;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-accent" aria-hidden />
        <h2 className="text-lg font-semibold">GigaSocial creator economy</h2>
      </div>
      <p className="text-sm text-muted">
        Tune reward formulas, unlock thresholds, and boost limits without redeploying the app.
      </p>

      <div className="space-y-3">
        {entries.map((entry) => (
          <article
            key={entry.key}
            className="rounded-2xl border bg-card p-4"
          >
            <label className="block text-sm font-medium text-foreground">
              {FIELD_LABELS[entry.key] ?? entry.key}
            </label>
            <p className="mt-0.5 text-xs text-muted">{entry.description}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={drafts[entry.key] ?? entry.value}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [entry.key]: e.target.value }))
                }
                className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm"
              />
              <Button
                type="button"
                size="sm"
                disabled={busyKey === entry.key}
                onClick={() => void handleSave(entry.key)}
                className="min-h-10 shrink-0"
              >
                {busyKey === entry.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                Save
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
});
