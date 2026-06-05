/** Fields from Convex `users` row that affect chat chrome (not full doc identity). */
export type ChatUserSnapshot = {
  credits: number;
  tokens: number;
  interestProfile: string | null;
};

export function toChatUserSnapshot(
  user: {
    credits?: number;
    tokens?: number;
    interestProfile?: string | null;
  } | null
  | undefined
): ChatUserSnapshot | null {
  if (!user) return null;
  return {
    credits: user.credits ?? 0,
    tokens: user.tokens ?? 0,
    interestProfile: user.interestProfile ?? null,
  };
}

export function chatUserSnapshotEqual(
  a: ChatUserSnapshot | null,
  b: ChatUserSnapshot | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.credits === b.credits &&
    a.tokens === b.tokens &&
    a.interestProfile === b.interestProfile
  );
}
