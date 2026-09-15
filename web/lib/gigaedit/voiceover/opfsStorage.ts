/**
 * OPFS storage for voiceover chunks and muxed exports.
 * Keeps large audio off the JS heap on 3G / low-RAM Ghana phones.
 */

const VOICEOVER_DIR = "gigaedit-voiceover";

export type OpfsVoiceoverSession = {
  sessionId: string;
  chunkCount: number;
  mimeType: string;
};

function voiceoverRoot() {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
    return null;
  }
  return navigator.storage.getDirectory();
}

export function supportsOpfs(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.storage?.getDirectory);
}

async function sessionDir(sessionId: string): Promise<FileSystemDirectoryHandle | null> {
  const root = await voiceoverRoot();
  if (!root) return null;
  const base = await root.getDirectoryHandle(VOICEOVER_DIR, { create: true });
  return base.getDirectoryHandle(sessionId, { create: true });
}

export async function writeVoiceoverChunk(
  sessionId: string,
  index: number,
  blob: Blob
): Promise<boolean> {
  const dir = await sessionDir(sessionId);
  if (!dir) return false;
  const handle = await dir.getFileHandle(`chunk-${String(index).padStart(5, "0")}.webm`, {
    create: true,
  });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  return true;
}

export async function writeVoiceoverMeta(
  sessionId: string,
  meta: { mimeType: string; chunkCount: number }
): Promise<void> {
  const dir = await sessionDir(sessionId);
  if (!dir) return;
  const handle = await dir.getFileHandle("meta.json", { create: true });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(meta));
  await writable.close();
}

export async function readVoiceoverBlob(sessionId: string): Promise<Blob | null> {
  const dir = await sessionDir(sessionId);
  if (!dir) return null;
  let meta: { mimeType?: string; chunkCount?: number } = {};
  try {
    const metaHandle = await dir.getFileHandle("meta.json");
    const metaFile = await metaHandle.getFile();
    meta = JSON.parse(await metaFile.text()) as { mimeType?: string; chunkCount?: number };
  } catch {
    return null;
  }
  const parts: Blob[] = [];
  const count = meta.chunkCount ?? 0;
  for (let i = 0; i < count; i += 1) {
    try {
      const handle = await dir.getFileHandle(`chunk-${String(i).padStart(5, "0")}.webm`);
      parts.push(await handle.getFile());
    } catch {
      break;
    }
  }
  if (!parts.length) return null;
  return new Blob(parts, { type: meta.mimeType || "audio/webm;codecs=opus" });
}

/** Read OPFS blob and return a playback URL (caller should revoke when done). */
export async function createOpfsPlaybackUrl(sessionId: string): Promise<string | null> {
  const blob = await readVoiceoverBlob(sessionId);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function deleteVoiceoverSession(sessionId: string): Promise<void> {
  const root = await voiceoverRoot();
  if (!root) return;
  try {
    const base = await root.getDirectoryHandle(VOICEOVER_DIR);
    await base.removeEntry(sessionId, { recursive: true });
  } catch {
    /* ignore */
  }
}

export function newVoiceoverSessionId(): string {
  return `vo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
