import type { CreationDraft } from "@/lib/gigalearn/creation/types";

const DRAFTS_KEY = "giga3_creation_drafts";
const MAX_DRAFTS = 20;

function read(): CreationDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as CreationDraft[]) : [];
  } catch {
    return [];
  }
}

function write(drafts: CreationDraft[]): boolean {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.slice(0, MAX_DRAFTS)));
    return true;
  } catch {
    return false;
  }
}

export function listCreationDrafts(): CreationDraft[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getCreationDraft(id: string): CreationDraft | null {
  return read().find((draft) => draft.id === id) ?? null;
}

export function saveCreationDraft(draft: CreationDraft): boolean {
  const rest = read().filter((existing) => existing.id !== draft.id);
  return write([{ ...draft, updatedAt: Date.now() }, ...rest]);
}

export function deleteCreationDraft(id: string): void {
  write(read().filter((draft) => draft.id !== id));
}

export function newDraftId(): string {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
