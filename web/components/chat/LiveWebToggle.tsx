"use client";

import { cn } from "@/lib/utils";
import {
  liveWebUnavailableMessage,
  readLiveWebEnabled,
  readLiveWebMode,
  readResearchCapability,
  writeLiveWebEnabled,
  writeLiveWebMode,
  writeResearchCapability,
  resolveSendResearchOptions,
  type LiveWebMode,
} from "@/lib/chat/liveWebPreferences";
import {
  RESEARCH_CAPABILITY_LABELS,
  type ResearchCapabilityId,
} from "convex/researchCapabilities";
import { Globe, ShieldAlert } from "lucide-react";
import { memo, useEffect, useId, useState } from "react";

interface LiveWebToggleProps {
  disabled?: boolean;
  online?: boolean;
  onChange?: (enabled: boolean, mode: LiveWebMode, capability: ResearchCapabilityId) => void;
}

const RESEARCH_OPTIONS: ResearchCapabilityId[] = [
  "general",
  "live_web",
  "current_news",
  "ghana_news",
  "africa_news",
  "world_news",
  "technology",
  "business",
  "education",
  "sports",
  "entertainment",
  "science",
  "politics",
  "breaking_news",
  "fact_check",
  "verify_image",
  "deep_research",
];

export const LiveWebToggle = memo(function LiveWebToggle({
  disabled,
  online = true,
  onChange,
}: LiveWebToggleProps) {
  const inputId = useId();
  const modeId = useId();
  const capabilityId = useId();
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<LiveWebMode>("research");
  const [capability, setCapability] = useState<ResearchCapabilityId>("general");
  const offlineMessage = liveWebUnavailableMessage(online);

  useEffect(() => {
    setEnabled(readLiveWebEnabled());
    setMode(readLiveWebMode());
    setCapability(readResearchCapability());
  }, []);

  function update(
    nextEnabled: boolean,
    nextMode: LiveWebMode = mode,
    nextCapability: ResearchCapabilityId = capability
  ) {
    setEnabled(nextEnabled);
    setMode(nextMode);
    setCapability(nextCapability);
    writeLiveWebEnabled(nextEnabled);
    writeLiveWebMode(nextMode);
    writeResearchCapability(nextCapability);
    onChange?.(nextEnabled, nextMode, nextCapability);
  }

  const toggleDisabled = disabled || !online;

  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <label
        htmlFor={inputId}
        className={cn(
          "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
          enabled
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-border bg-card text-foreground",
          toggleDisabled && "cursor-not-allowed opacity-50"
        )}
      >
        <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>Live Web</span>
        <input
          id={inputId}
          type="checkbox"
          className="sr-only"
          checked={enabled}
          disabled={toggleDisabled}
          onChange={(e) => update(e.target.checked)}
        />
        <span
          aria-hidden
          className={cn(
            "relative inline-flex h-5 w-9 rounded-full transition-colors",
            enabled ? "bg-accent" : "bg-zinc-300 dark:bg-zinc-600"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
              enabled ? "translate-x-4" : "translate-x-0.5"
            )}
          />
        </span>
      </label>

      {enabled && online ? (
        <>
          <label htmlFor={capabilityId} className="inline-flex items-center gap-2 text-xs text-muted">
            <span className="sr-only">Research mode</span>
            <select
              id={capabilityId}
              disabled={toggleDisabled}
              value={capability}
              onChange={(e) =>
                update(true, mode, e.target.value as ResearchCapabilityId)
              }
              className="max-w-[11rem] rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground"
            >
              {RESEARCH_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {RESEARCH_CAPABILITY_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor={modeId} className="inline-flex items-center gap-2 text-xs text-muted">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Live web mode</span>
            <select
              id={modeId}
              disabled={toggleDisabled}
              value={mode}
              onChange={(e) => update(true, e.target.value as LiveWebMode)}
              className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground"
            >
              <option value="research">Research</option>
              <option value="actions">Web Actions</option>
            </select>
          </label>
        </>
      ) : null}

      {offlineMessage ? (
        <p className="text-[11px] text-amber-700 dark:text-amber-300">{offlineMessage}</p>
      ) : null}
    </div>
  );
});

export function currentLiveWebSendOptions(args?: {
  query?: string;
  hasImageAttachment?: boolean;
}): {
  liveWeb: boolean;
  liveWebMode?: LiveWebMode;
  researchCapability?: ResearchCapabilityId;
} {
  const { autoEnabled: _autoEnabled, ...payload } = resolveSendResearchOptions(args);
  return payload;
}
