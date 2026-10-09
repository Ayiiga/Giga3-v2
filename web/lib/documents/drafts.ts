import type { GigaDocument } from "@/lib/documents/types";
import { evaluateOnePageFit } from "@/lib/documents/model";

const STORAGE_KEY = "giga3_document_drafts_v1";
const ACTIVE_KEY = "giga3_document_active_v1";

function readAll(): GigaDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GigaDocument[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(docs: GigaDocument[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs.slice(0, 40)));
}

export function listDocumentDrafts(): GigaDocument[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getDocumentDraft(id: string): GigaDocument | null {
  return readAll().find((d) => d.id === id) ?? null;
}

export function saveDocumentDraft(doc: GigaDocument): GigaDocument {
  const next: GigaDocument = {
    ...doc,
    updatedAt: Date.now(),
    fitWarning: evaluateOnePageFit(doc),
  };
  const others = readAll().filter((d) => d.id !== next.id);
  writeAll([next, ...others]);
  setActiveDocumentId(next.id);
  return next;
}

export function removeDocumentDraft(id: string): void {
  writeAll(readAll().filter((d) => d.id !== id));
  if (getActiveDocumentId() === id) setActiveDocumentId(null);
}

export function getActiveDocumentId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveDocumentId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (!id) localStorage.removeItem(ACTIVE_KEY);
  else localStorage.setItem(ACTIVE_KEY, id);
}

export function getActiveDocument(): GigaDocument | null {
  const id = getActiveDocumentId();
  return id ? getDocumentDraft(id) : null;
}
