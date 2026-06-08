import type { AiModeId } from "@/lib/aiRouter";
import { Bolt, Brain, Eye, Palette, type LucideIcon } from "lucide-react";

export type GigaModelId = "fast" | "smart" | "vision" | "creator";

export interface GigaModelDefinition {
  id: GigaModelId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  /** Maps to existing Convex AI mode — no backend schema changes. */
  mode: AiModeId;
}

export const GIGA_MODELS: GigaModelDefinition[] = [
  {
    id: "fast",
    label: "Giga3 Fast",
    shortLabel: "Fast",
    description: "Quick replies for everyday chat",
    icon: Bolt,
    mode: "general",
  },
  {
    id: "smart",
    label: "Giga3 Smart",
    shortLabel: "Smart",
    description: "Deeper reasoning and research",
    icon: Brain,
    mode: "research",
  },
  {
    id: "vision",
    label: "Giga3 Vision",
    shortLabel: "Vision",
    description: "Images, files, and visual tasks",
    icon: Eye,
    mode: "general",
  },
  {
    id: "creator",
    label: "Giga3 Creator",
    shortLabel: "Creator",
    description: "Writing, social content, and media",
    icon: Palette,
    mode: "social",
  },
];

const STORAGE_KEY = "giga3_model_tier";

export function getGigaModel(id: GigaModelId): GigaModelDefinition {
  return GIGA_MODELS.find((m) => m.id === id) ?? GIGA_MODELS[0];
}

export function isValidGigaModel(id: string): id is GigaModelId {
  return GIGA_MODELS.some((m) => m.id === id);
}

export function gigaModelForMode(mode: AiModeId): GigaModelId {
  const match = GIGA_MODELS.find((m) => m.mode === mode);
  return match?.id ?? "fast";
}

export function readStoredGigaModel(): GigaModelId {
  if (typeof window === "undefined") return "fast";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw && isValidGigaModel(raw) ? raw : "fast";
  } catch {
    return "fast";
  }
}

export function storeGigaModel(id: GigaModelId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore quota */
  }
}
