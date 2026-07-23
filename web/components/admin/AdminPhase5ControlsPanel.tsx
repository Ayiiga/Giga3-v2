"use client";

import { Button } from "@/components/ui/Button";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Rocket } from "lucide-react";
import { useState } from "react";

type AdminCreds = { adminSessionToken: string };

const GROUP_LABEL: Record<string, string> = {
  "phase5.beta": "Impl 1 — Public beta",
  "phase5.feedback": "Impl 2 — Feedback platform",
  "phase5.creator_success": "Impl 3 — Creator success",
  "phase5.education": "Impl 4 — Education expansion",
  "phase5.personalization": "Impl 5 — AI personalization",
  "phase5.community_growth": "Impl 6 — Community growth",
  "phase5.monetization_beta": "Impl 7 — Monetization beta",
  "phase5.product_analytics": "Impl 8 — Product analytics",
  "phase5.marketing": "Impl 9 — Marketing readiness",
  "phase5.admin_tools": "Admin tools (Phase 5)",
};

/**
 * Controlled Phase 5 public-beta toggles.
 * All modules default OFF — enable only after validation (see PHASE_5_CONTROLLED_ROLLOUT.md).
 */
export function AdminPhase5ControlsPanel({
  adminCreds,
  onNotice,
  onError,
}: {
  adminCreds: AdminCreds;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const flags = useQuery(api.remoteConfig.getPhase5ConfigAdmin, adminCreds);
  const updateFlag = useMutation(api.remoteConfig.updatePhase5ConfigAdmin);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  if (flags === undefined) {
    return <p className="text-sm text-muted">Loading Phase 5 controls…</p>;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
          <Rocket className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Phase 5 public beta controls</h2>
          <p className="mt-1 text-sm text-muted">
            Growth modules stay disabled until you enable them. Disabling a flag
            immediately hides the surface — no data loss, no auth changes.
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {flags.map((flag) => (
          <li
            key={flag.key}
            className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="font-medium">{GROUP_LABEL[flag.key] ?? flag.key}</div>
              <p className="mt-1 text-sm text-muted">{flag.description}</p>
              <p className="mt-1 text-xs text-muted">
                {flag.key} · value={flag.value} · rollout={flag.rolloutPercent}% ·{" "}
                {flag.enabled ? "enabled" : "disabled"}
              </p>
            </div>
            <Button
              size="sm"
              variant={flag.enabled ? "secondary" : "primary"}
              disabled={busyKey === flag.key}
              onClick={() => {
                void (async () => {
                  setBusyKey(flag.key);
                  onError("");
                  try {
                    await updateFlag({
                      ...adminCreds,
                      key: flag.key,
                      enabled: !flag.enabled,
                      rolloutPercent: flag.enabled ? flag.rolloutPercent : 100,
                    });
                    onNotice(
                      `${flag.key} ${flag.enabled ? "disabled" : "enabled"}.`
                    );
                  } catch (e) {
                    onError(
                      e instanceof Error ? e.message : "Could not update flag."
                    );
                  } finally {
                    setBusyKey(null);
                  }
                })();
              }}
            >
              {flag.enabled ? "Disable" : "Enable"}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
