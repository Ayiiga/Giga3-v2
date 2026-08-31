/**
 * Local Brand Kit — stored in IndexedDB alongside GigaEdit projects.
 * Applies branding metadata to projects; does not overwrite source media.
 */

const DB_NAME = "giga3-gigaedit-v1";
const BRAND_KEY = "gigaedit-brand-kit";

export type GigaEditBrandKit = {
  id: typeof BRAND_KEY;
  updatedAt: number;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  watermarkText: string;
  introText: string;
  outroText: string;
  ctaText: string;
  socialHandles: string;
  /** Data URL for logo preview (optional, user-uploaded). */
  logoDataUrl?: string;
  /** When true, registered user branding may be auto-cleaned on import. */
  autoCleanMyBranding?: boolean;
};

export const DEFAULT_BRAND_KIT: GigaEditBrandKit = {
  id: BRAND_KEY,
  updatedAt: Date.now(),
  name: "My Brand",
  primaryColor: "#fbbf24",
  secondaryColor: "#3b82f6",
  accentColor: "#ffffff",
  fontFamily: "system-ui, sans-serif",
  watermarkText: "",
  introText: "",
  outroText: "",
  ctaText: "",
  socialHandles: "",
  autoCleanMyBranding: false,
};

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
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

export async function loadBrandKit(): Promise<GigaEditBrandKit> {
  const db = await openDb();
  if (!db) return { ...DEFAULT_BRAND_KIT, updatedAt: Date.now() };
  try {
    const tx = db.transaction("projects", "readonly");
    const row = (await idbReq(tx.objectStore("projects").get(BRAND_KEY))) as
      | GigaEditBrandKit
      | undefined;
    if (row?.id === BRAND_KEY) return row;
  } catch {
    /* fall through */
  }
  return { ...DEFAULT_BRAND_KIT, updatedAt: Date.now() };
}

export async function saveBrandKit(
  kit: Omit<GigaEditBrandKit, "id" | "updatedAt">
): Promise<GigaEditBrandKit> {
  const next: GigaEditBrandKit = {
    ...DEFAULT_BRAND_KIT,
    ...kit,
    id: BRAND_KEY,
    updatedAt: Date.now(),
  };
  const db = await openDb();
  if (!db) return next;
  const tx = db.transaction("projects", "readwrite");
  await idbReq(tx.objectStore("projects").put(next));
  return next;
}

/** Merge brand overlay hints into project overlay text (non-destructive). */
export function brandWatermarkHint(kit: GigaEditBrandKit): string | null {
  const parts = [kit.watermarkText, kit.socialHandles].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
