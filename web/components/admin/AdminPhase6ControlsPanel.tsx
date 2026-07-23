"use client";

import { Button } from "@/components/ui/Button";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Globe2 } from "lucide-react";
import { useState } from "react";

type AdminCreds = { adminSessionToken: string };

const GROUP_LABEL: Record<string, string> = {
  "phase6.multi_region": "Impl 1 — Multi-region",
  "phase6.creator_ecosystem": "Impl 2 — Creator ecosystem",
  "phase6.education": "Impl 3 — Education platform",
  "phase6.org_accounts": "Impl 4 — Organization accounts",
  "phase6.ai_platform": "Impl 5 — AI platform",
  "phase6.commerce": "Impl 6 — Commerce & payments",
  "phase6.operations": "Impl 7 — Platform operations",
  "phase6.partnerships": "Impl 8 — Partnerships & growth",
  "phase6.compliance": "Impl 9 — Compliance & governance",
  "phase6.admin_tools": "Admin tools (Phase 6)",
};

/**
 * Controlled Phase 6 Africa-launch toggles.
 * All modules default OFF — enable only after validation (PHASE_6_CONTROLLED_ROLLOUT.md).
 */
export function AdminPhase6ControlsPanel({
  adminCreds,
  onNotice,
  onError,
}: {
  adminCreds: AdminCreds;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const flags = useQuery(api.remoteConfig.getPhase6ConfigAdmin, adminCreds);
  const updateFlag = useMutation(api.remoteConfig.updatePhase6ConfigAdmin);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  if (flags === undefined) {
    return <p className="text-sm text-muted">Loading Phase 6 controls…</p>;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800">
          <Globe2 className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Phase 6 Africa launch controls</h2>
          <p className="mt-1 text-sm text-muted">
            Scale modules stay disabled until you enable them. Disabling a flag
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
