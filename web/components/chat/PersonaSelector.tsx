"use client";

import {
  getPersonaLabel,
  listChatPersonas,
  type GigaPersonaId,
} from "@/lib/personas/gigaPersonas";
import { cn } from "@/lib/utils";

interface PersonaSelectorProps {
  value: GigaPersonaId | null;
  onChange: (personaId: GigaPersonaId | null) => void;
  disabled?: boolean;
  embedded?: boolean;
}

export function PersonaSelector({
  value,
  onChange,
  disabled,
  embedded = false,
}: PersonaSelectorProps) {
  const personas = listChatPersonas();

  return (
    <div className={cn(embedded ? "px-0" : "border-b border-border bg-white px-4 py-4 sm:px-5")}>
      {!embedded && (
        <label className="mb-3 block text-sm font-medium text-muted">
          Giga3 persona
        </label>
      )}
      <div className="grid auto-cols-[minmax(168px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-1 scrollbar-thin">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(null)}
          className={cn(
            "saas-card flex min-h-[4rem] shrink-0 flex-col justify-center px-3 py-3 text-left transition-all",
            value === null
              ? "border-violet-500/50 bg-gradient-to-br from-violet-600/20 to-blue-600/10 ring-1 ring-violet-500/40"
              : "text-muted hover:border-violet-500/30 hover:text-foreground"
          )}
        >
          <span className="text-sm font-semibold text-foreground">Default</span>
          <span className="mt-0.5 line-clamp-2 text-xs text-muted">
            Standard Giga3 assistant
          </span>
        </button>
        {personas.map((persona) => {
          const active = value === persona.id;
          return (
            <button
              key={persona.id}
              type="button"
              disabled={disabled}
              title={persona.tagline}
              onClick={() => onChange(persona.id)}
              className={cn(
                "saas-card flex min-h-[4rem] shrink-0 flex-col justify-center px-3 py-3 text-left transition-all",
                active
                  ? "border-violet-500/50 bg-gradient-to-br from-violet-600/25 to-blue-600/15 ring-1 ring-violet-500/40"
                  : "text-muted hover:border-violet-500/30 hover:text-foreground",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              <span className="text-sm font-semibold text-foreground">
                {persona.emoji} {persona.label}
              </span>
              <span className="mt-0.5 line-clamp-2 text-xs text-muted">
                {persona.tagline}
              </span>
            </button>
          );
        })}
      </div>
      {value ? (
        <p className="mt-2 text-xs text-muted">
          Active: {getPersonaLabel(value)} — responses use this persona&apos;s expertise and safety rules.
        </p>
      ) : null}
    </div>
  );
}
