"use client";

import type { BrandingDetection } from "@/lib/gigaedit/brandingDetection";
import type { BrandingAction, GigaEditTimelineClip } from "@/lib/gigaedit/types";

type BrandingPanelProps = {
  detections: BrandingDetection[];
  selectedClip: GigaEditTimelineClip | null;
  autoCleanEnabled: boolean;
  onApplyAction: (clipId: string, action: BrandingAction, detection: BrandingDetection) => void;
  onDismiss: () => void;
};

export function BrandingPanel({
  detections,
  selectedClip,
  autoCleanEnabled,
  onApplyAction,
  onDismiss,
}: BrandingPanelProps) {
  if (detections.length === 0) return null;

  return (
    <div className="gigaedit-glass space-y-3 border border-[var(--ge-gold)]/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-[var(--ge-gold)]">Branding detected</p>
          <p className="text-[11px] text-[var(--ge-muted)]">
            Third-party marks are never removed silently. User-owned Brand Kit assets can be cleaned
            when enabled{autoCleanEnabled ? " (auto-clean on)" : ""}.
          </p>
        </div>
        <button type="button" className="text-xs text-[var(--ge-muted)]" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
      <ul className="space-y-2">
        {detections.map((d) => (
          <li key={d.id} className="rounded-lg border border-[var(--ge-border)] p-2 text-[11px]">
            <p className="font-medium">{d.label}</p>
            <p className="text-[var(--ge-muted)]">
              Source: {d.source === "user" ? "Your brand" : "Unknown / third-party"}
            </p>
            {selectedClip ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {(["keep", "crop", "blur", "cover", "replace"] as BrandingAction[]).map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="gigaedit-chip px-2 py-0.5 capitalize"
                    onClick={() => onApplyAction(selectedClip.id, action, d)}
                  >
                    {action}
                  </button>
                ))}
                {d.source === "user" ? (
                  <button
                    type="button"
                    className="gigaedit-chip gigaedit-chip--active px-2 py-0.5"
                    onClick={() => onApplyAction(selectedClip.id, "remove", d)}
                  >
                    Auto remove
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="mt-1 text-[var(--ge-muted)]">Select a clip to apply branding actions.</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
