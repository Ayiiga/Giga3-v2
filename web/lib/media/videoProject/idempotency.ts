/** Client-side idempotency for per-scene generation — prevents duplicate charges on double-submit. */

const inFlight = new Map<string, string>();

export function sceneGenerationKey(projectId: string, sceneId: string): string {
  return `${projectId}:${sceneId}`;
}

export function beginSceneGeneration(projectId: string, sceneId: string, nonce: string): boolean {
  const key = sceneGenerationKey(projectId, sceneId);
  const existing = inFlight.get(key);
  if (existing && existing === nonce) return true;
  if (existing) return false;
  inFlight.set(key, nonce);
  return true;
}

export function completeSceneGeneration(projectId: string, sceneId: string, nonce: string): void {
  const key = sceneGenerationKey(projectId, sceneId);
  if (inFlight.get(key) === nonce) inFlight.delete(key);
}

export function newGenerationNonce(): string {
  return `gen_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isSceneGenerationInFlight(projectId: string, sceneId: string): boolean {
  return inFlight.has(sceneGenerationKey(projectId, sceneId));
}
