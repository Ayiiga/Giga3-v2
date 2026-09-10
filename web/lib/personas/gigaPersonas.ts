import {
  GIGA_PERSONA_DEFINITIONS,
  GIGA_PERSONA_IDS,
  listPersonasForProduct,
  type GigaPersonaId,
  type GigaPersonaProduct,
} from "../../../convex/gigaPersonas";

export {
  GIGA_PERSONA_DEFINITIONS,
  GIGA_PERSONA_IDS,
  listPersonasForProduct,
  type GigaPersonaId,
  type GigaPersonaProduct,
};

export type ChatPersonaOption = {
  id: GigaPersonaId;
  label: string;
  emoji: string;
  tagline: string;
  suggestedActions: readonly string[];
};

export function listChatPersonas(): ChatPersonaOption[] {
  return listPersonasForProduct("chat").map((persona) => ({
    id: persona.id,
    label: persona.label,
    emoji: persona.emoji,
    tagline: persona.tagline,
    suggestedActions: persona.suggestedActions,
  }));
}

const STORAGE_KEY = "giga3_persona_id";

export function readStoredPersonaId(): GigaPersonaId | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    return (GIGA_PERSONA_IDS as readonly string[]).includes(value)
      ? (value as GigaPersonaId)
      : null;
  } catch {
    return null;
  }
}

export function writeStoredPersonaId(personaId: GigaPersonaId | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!personaId) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, personaId);
  } catch {
    /* ignore quota errors */
  }
}

export function getPersonaLabel(personaId: string | undefined | null): string | null {
  if (!personaId) return null;
  const persona = GIGA_PERSONA_DEFINITIONS[personaId as GigaPersonaId];
  return persona ? `${persona.emoji} ${persona.label}` : null;
}
