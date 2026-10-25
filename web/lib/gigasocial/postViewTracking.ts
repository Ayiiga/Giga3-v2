/** Session-scoped dedupe for GigaSocial post view impressions. */

export const SOCIAL_POST_VIEW_STORAGE_KEY = "giga3_social_post_views_v1";
const MAX_TRACKED_IDS = 200;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function readIds(storage: StorageLike): string[] {
  try {
    const raw = storage.getItem(SOCIAL_POST_VIEW_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

function writeIds(storage: StorageLike, ids: string[]): void {
  try {
    storage.setItem(SOCIAL_POST_VIEW_STORAGE_KEY, JSON.stringify(ids.slice(-MAX_TRACKED_IDS)));
  } catch {
    /* quota / private mode */
  }
}

export function hasRecordedPostView(
  postId: string,
  storage: StorageLike | null | undefined = typeof window !== "undefined"
    ? window.sessionStorage
    : null
): boolean {
  if (!postId || !storage) return false;
  return readIds(storage).includes(postId);
}

export function markPostViewRecorded(
  postId: string,
  storage: StorageLike | null | undefined = typeof window !== "undefined"
    ? window.sessionStorage
    : null
): void {
  if (!postId || !storage) return;
  const ids = readIds(storage);
  if (ids.includes(postId)) return;
  ids.push(postId);
  writeIds(storage, ids);
}

/** Pure helper: whether a dwell timer should fire a record call. */
export function shouldRecordPostViewImpression(args: {
  postId: string;
  alreadyRecorded: boolean;
  inView: boolean;
  dwellMs: number;
  requiredDwellMs: number;
}): boolean {
  if (!args.postId || args.alreadyRecorded || !args.inView) return false;
  return args.dwellMs >= args.requiredDwellMs;
}
