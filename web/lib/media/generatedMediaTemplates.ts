/**
 * Persist genuinely generated media as reusable templates (IndexedDB).
 * Stores the real output URL and generation metadata — no placeholder records.
 */

export type GeneratedMediaKind = "image" | "video";

export type GeneratedMediaTemplate = {
  id: string;
  mediaType: GeneratedMediaKind;
  /** Canonical stored asset URL from the generation job. */
  mediaUrl: string;
  prompt: string;
  jobId?: string;
  provider?: string;
  aspectRatio?: string;
  createdAt: number;
  updatedAt: number;
};

const DB_NAME = "giga3-generated-media-templates-v1";
const STORE = "templates";

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function idbReq<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB error"));
  });
}

export function newGeneratedMediaTemplateId(): string {
  return `gmt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export type SaveGeneratedMediaTemplateInput = {
  mediaType: GeneratedMediaKind;
  mediaUrl: string;
  prompt: string;
  jobId?: string;
  provider?: string;
  aspectRatio?: string;
};

export async function saveGeneratedMediaTemplate(
  input: SaveGeneratedMediaTemplateInput
): Promise<GeneratedMediaTemplate> {
  const mediaUrl = input.mediaUrl?.trim();
  const prompt = input.prompt?.trim();
  if (!mediaUrl) throw new Error("Template requires a real media URL.");
  if (!prompt) throw new Error("Template requires the generation prompt.");

  const record: GeneratedMediaTemplate = {
    id: newGeneratedMediaTemplateId(),
    mediaType: input.mediaType,
    mediaUrl,
    prompt,
    jobId: input.jobId,
    provider: input.provider,
    aspectRatio: input.aspectRatio,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const db = await openDb();
  if (!db) throw new Error("Could not open local template storage on this device.");

  try {
    const tx = db.transaction(STORE, "readwrite");
    await idbReq(tx.objectStore(STORE).put(record));
    return record;
  } catch (err) {
    throw new Error(
      err instanceof Error ? `Template was not saved: ${err.message}` : "Template was not saved."
    );
  }
}

export async function getGeneratedMediaTemplate(
  id: string
): Promise<GeneratedMediaTemplate | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const tx = db.transaction(STORE, "readonly");
    const row = await idbReq(tx.objectStore(STORE).get(id));
    return (row as GeneratedMediaTemplate) ?? null;
  } catch {
    return null;
  }
}

export async function listGeneratedMediaTemplates(): Promise<GeneratedMediaTemplate[]> {
  const db = await openDb();
  if (!db) return [];
  try {
    const tx = db.transaction(STORE, "readonly");
    const rows = await idbReq(tx.objectStore(STORE).getAll());
    return (rows as GeneratedMediaTemplate[]).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

const HANDOFF_KEY = "giga3_generated_media_template_handoff";

export function persistGeneratedMediaTemplateHandoff(template: GeneratedMediaTemplate): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(template));
}

export function consumeGeneratedMediaTemplateHandoff(): GeneratedMediaTemplate | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(HANDOFF_KEY);
    return JSON.parse(raw) as GeneratedMediaTemplate;
  } catch {
    return null;
  }
}

/** Open AI Chat with the template prompt pre-filled. */
export function chatUrlForGeneratedTemplate(template: GeneratedMediaTemplate): string {
  const params = new URLSearchParams();
  params.set("prompt", template.prompt.slice(0, 2000));
  if (template.mediaType === "image" && template.mediaUrl) {
    params.set("attachImage", template.mediaUrl);
  }
  return `/chat/?${params.toString()}`;
}

/** Open GigaSocial composer seeded from the template. */
export function gigasocialUrlForGeneratedTemplate(template: GeneratedMediaTemplate): string {
  persistGeneratedMediaTemplateHandoff(template);
  const params = new URLSearchParams({ tab: "feed", generatedTemplate: template.id });
  return `/gigasocial/?${params.toString()}`;
}

/** Open Media Studio with prompt + optional source image. */
export function mediaStudioUrlForGeneratedTemplate(template: GeneratedMediaTemplate): string {
  const params = new URLSearchParams({
    tab: template.mediaType === "video" ? "video" : "image",
    prompt: template.prompt.slice(0, 2000),
    generatedTemplate: template.id,
  });
  if (template.mediaType === "image") {
    params.set("source", template.mediaUrl);
  }
  return `/media/?${params.toString()}`;
}

/** Open GigaEdit video editor importing the real generated video asset. */
export function gigaEditUrlForGeneratedTemplate(template: GeneratedMediaTemplate): string {
  if (template.mediaType !== "video") {
    const params = new URLSearchParams({ tab: "photo", importUrl: template.mediaUrl });
    return `/gigaedit/?${params.toString()}`;
  }
  const params = new URLSearchParams({ tab: "video" });
  params.set("clip0", template.mediaUrl);
  if (template.aspectRatio) params.set("aspect", template.aspectRatio);
  if (template.prompt) params.set("overlayText", template.prompt.slice(0, 200));
  params.set("generatedTemplate", template.id);
  return `/gigaedit/?${params.toString()}`;
}
