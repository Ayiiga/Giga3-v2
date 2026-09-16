const inFlight = new Map<string, string>();

export function beginPreProdRequest(kind: string, nonce: string): boolean {
  const existing = inFlight.get(kind);
  if (existing && existing === nonce) return true;
  if (existing) return false;
  inFlight.set(kind, nonce);
  return true;
}

export function completePreProdRequest(kind: string, nonce: string): void {
  if (inFlight.get(kind) === nonce) inFlight.delete(kind);
}

export function newPreProdNonce(): string {
  return `pp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
