/** Server-side user interest learning — lightweight profile from chat history. */

export type InterestProfile = {
  messageCount: number;
  modes: Record<string, number>;
  topics: string[];
  lastUpdated: number;
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "been",
  "before",
  "could",
  "from",
  "have",
  "help",
  "just",
  "like",
  "make",
  "need",
  "please",
  "that",
  "this",
  "what",
  "when",
  "with",
  "would",
  "your",
  "you",
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
]);

export function emptyInterestProfile(): InterestProfile {
  return { messageCount: 0, modes: {}, topics: [], lastUpdated: 0 };
}

export function parseInterestProfile(raw: string | undefined | null): InterestProfile {
  if (!raw) return emptyInterestProfile();
  try {
    const parsed = JSON.parse(raw) as Partial<InterestProfile>;
    return {
      messageCount: typeof parsed.messageCount === "number" ? parsed.messageCount : 0,
      modes:
        parsed.modes && typeof parsed.modes === "object" ? { ...parsed.modes } : {},
      topics: Array.isArray(parsed.topics)
        ? parsed.topics.filter((t): t is string => typeof t === "string").slice(0, 12)
        : [],
      lastUpdated: typeof parsed.lastUpdated === "number" ? parsed.lastUpdated : 0,
    };
  } catch {
    return emptyInterestProfile();
  }
}

export function serializeInterestProfile(profile: InterestProfile): string {
  return JSON.stringify(profile);
}

export function updateInterestProfile(
  profile: InterestProfile,
  mode: string,
  content: string
): InterestProfile {
  const modes = { ...profile.modes };
  modes[mode] = (modes[mode] ?? 0) + 1;

  const topicCounts = new Map<string, number>();
  for (const topic of profile.topics) {
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 2);
  }

  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  for (const word of words.slice(0, 24)) {
    topicCounts.set(word, (topicCounts.get(word) ?? 0) + 1);
  }

  const topics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  return {
    messageCount: profile.messageCount + 1,
    modes,
    topics,
    lastUpdated: Date.now(),
  };
}

/** Appended to the system prompt for returning users (not stored in chat UI). */
export function buildInterestSystemAddon(profile: InterestProfile): string {
  if (profile.messageCount < 3) return "";

  const topModes = Object.entries(profile.modes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mode]) => mode.replace(/_/g, " "));

  const parts: string[] = [];
  if (topModes.length) {
    parts.push(`They often use modes such as ${topModes.join(", ")}.`);
  }
  if (profile.topics.length) {
    parts.push(
      `Recurring interests include: ${profile.topics.slice(0, 6).join(", ")}.`
    );
  }
  if (!parts.length) return "";

  return (
    `\n\n[Returning user — ${profile.messageCount} messages logged] ` +
    parts.join(" ") +
    " Adapt examples and depth to these interests. Do not mention this profile note to the user."
  );
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
