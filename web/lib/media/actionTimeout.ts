/** Client-side guard so hung Convex actions do not leave the UI stuck forever. */
export function withActionTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export const MEDIA_IMAGE_TIMEOUT_MS = 6 * 60 * 1000;
/** Legacy synchronous video call (kept for old bundles). */
export const MEDIA_VIDEO_TIMEOUT_MS = 13 * 60 * 1000;
/** New async pipeline: the enqueue call only creates the job. */
export const MEDIA_VIDEO_ENQUEUE_TIMEOUT_MS = 45 * 1000;
