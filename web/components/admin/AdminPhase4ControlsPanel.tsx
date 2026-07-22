"use client";

import { Button } from "@/components/ui/Button";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Shield } from "lucide-react";
import { useState } from "react";

type AdminCreds = { adminSessionToken: string };

const GROUP_LABEL: Record<string, string> = {
  "phase4.security": "Group 1 — Security",
  "phase4.monitoring": "Group 1 — Monitoring",
  "phase4.offline": "Group 2 — Offline / recovery UX",
  "phase4.reliability": "Group 2 — Reliability helpers",
  "phase4.admin_tools": "Group 3 — Admin tools",
};

/**
 * Controlled Phase 4 upgrade toggles.
 * Disabling a flag is an emergency control — does not delete data or change auth.
 */
export function AdminPhase4ControlsPanel({
  adminCreds,
  onNotice,
  onError,
}: {
  adminCreds: AdminCreds;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const flags = useQuery(api.remoteConfig.getPhase4ConfigAdmin, adminCreds);
  const updateFlag = useMutation(api.remoteConfig.updatePhase4ConfigAdmin);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  if (flags === undefined) {
    return <p className="text-sm text-muted">Loading Phase 4 controls…</p>;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Shield className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Phase 4 controlled upgrade</h2>
          <p className="mt-1 text-sm text-muted">
            Toggle release groups without redeploy. Env kill-switch{" "}
            <code className="text-xs">GIGA3_SOCIAL_WRITE_RATE_LIMIT=false</code> still
            force-disables social write limits. Upload hardening stays on.
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
              <div className="font-medium">
                {GROUP_LABEL[flag.key] ?? flag.key}
              </div>
              <p className="mt-1 text-sm text-muted">{flag.description}</p>
              <p className="mt-1 text-xs text-muted">
                {flag.key} · value={flag.value} ·{" "}
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
