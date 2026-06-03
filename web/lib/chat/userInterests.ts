export type InterestProfile = {
  messageCount: number;
  modes: Record<string, number>;
  topics: string[];
  lastUpdated: number;
};

export function parseInterestProfile(raw: string | undefined | null): InterestProfile {
  if (!raw) {
    return { messageCount: 0, modes: {}, topics: [], lastUpdated: 0 };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<InterestProfile>;
    return {
      messageCount: typeof parsed.messageCount === "number" ? parsed.messageCount : 0,
      modes: parsed.modes && typeof parsed.modes === "object" ? parsed.modes : {},
      topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 12) : [],
      lastUpdated: typeof parsed.lastUpdated === "number" ? parsed.lastUpdated : 0,
    };
  } catch {
    return { messageCount: 0, modes: {}, topics: [], lastUpdated: 0 };
  }
}

export function formatInterestSummary(profile: InterestProfile): string | null {
  if (profile.messageCount < 5) return null;
  const topModes = Object.entries(profile.modes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([m]) => m.replace(/_/g, " "));
  const topics = profile.topics.slice(0, 4);
  if (!topModes.length && !topics.length) return null;
  const bits: string[] = [];
  if (topModes.length) bits.push(`modes: ${topModes.join(", ")}`);
  if (topics.length) bits.push(`topics: ${topics.join(", ")}`);
  return bits.join(" · ");
}
