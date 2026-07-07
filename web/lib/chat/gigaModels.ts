import type { AiModeId } from "@/lib/aiRouter";
import { Bolt, Brain, Crown, Eye, Palette, type LucideIcon } from "lucide-react";

export type GigaModelId = "fast" | "smart" | "vision" | "creator" | "pro";

export type ChatEngineId = "gemini" | "fal_ai" | "openai";

export interface GigaModelDefinition {
  id: GigaModelId;
  label: string;
  shortLabel: string;
  description: string;
  engine: ChatEngineId;
  engineLabel: string;
  icon: LucideIcon;
  /** Maps to existing Convex AI mode — no backend schema changes. */
  mode: AiModeId;
  /** OpenAI path — subscribers and credit-pack purchasers only. */
  requiresPremium?: boolean;
}

export const GIGA_MODELS: GigaModelDefinition[] = [
  {
    id: "fast",
    label: "Giga3 Fast",
    shortLabel: "Fast",
    description: "Quick everyday chat",
    engine: "gemini",
    engineLabel: "Gemini",
    icon: Bolt,
    mode: "general",
  },
  {
    id: "smart",
    label: "Giga3 Smart",
    shortLabel: "Smart",
    description: "Deeper reasoning via fal.ai",
    engine: "fal_ai",
    engineLabel: "fal.ai",
    icon: Brain,
    mode: "research",
  },
  {
    id: "vision",
    label: "Giga3 Vision",
    shortLabel: "Vision",
    description: "Images, files, and visual tasks",
    engine: "gemini",
    engineLabel: "Gemini Vision",
    icon: Eye,
    mode: "general",
  },
  {
    id: "creator",
    label: "Giga3 Creator",
    shortLabel: "Creator",
    description: "Writing and creative content",
    engine: "fal_ai",
    engineLabel: "fal.ai",
    icon: Palette,
    mode: "social",
  },
  {
    id: "pro",
    label: "Giga3 Pro",
    shortLabel: "Pro",
    description: "OpenAI GPT-4 — 5 free/day, unlimited for subscribers",
    engine: "openai",
    engineLabel: "OpenAI",
    icon: Crown,
    mode: "general",
    requiresPremium: false,
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
  if (mode === "gigalearn" || mode === "homework" || mode === "waec" || mode === "university") {
    return "fast";
  }
  const match = GIGA_MODELS.find((m) => m.mode === mode && !m.requiresPremium);
  return match?.id ?? "fast";
}

export function modelsForAccess(_hasOpenAiAccess?: boolean): GigaModelDefinition[] {
  return GIGA_MODELS;
}

export function isProModelLocked(
  modelId: GigaModelId,
  hasOpenAiAccess: boolean
): boolean {
  return modelId === "pro" && !hasOpenAiAccess;
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

/** Chat system id sent to Convex — pro always maps to OpenAI routing (quota checked server-side). */
export function chatSystemForModel(id: GigaModelId): GigaModelId {
  return id;
}
