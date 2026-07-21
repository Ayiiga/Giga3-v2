/** Suggestion-only AI Community Assistant — never auto-removes content. */

export type CommunityModerationSuggestion = {
  id: string;
  severity: "info" | "watch" | "review";
  title: string;
  detail: string;
  /** Explicit: humans decide; AI never deletes. */
  action: "recommend_review" | "recommend_pin" | "recommend_welcome" | "recommend_translate";
};

export type CommunityAssistantInsight = {
  id: string;
  kind: "summary" | "insight" | "event" | "stats" | "welcome" | "translation";
  title: string;
  body: string;
};

export function buildCommunityWelcome(communityName: string): string {
  return `Welcome to ${communityName}! Introduce yourself, keep it respectful, and ask the AI assistant for a quick orientation anytime.`;
}

export function buildCommunitySummary(args: {
  name: string;
  memberCount: number;
  joined?: boolean;
}): CommunityAssistantInsight {
  return {
    id: "summary",
    kind: "summary",
    title: "Auto summary",
    body: `${args.name} has ${args.memberCount} member${
      args.memberCount === 1 ? "" : "s"
    }. ${
      args.joined
        ? "You're in — share an announcement or start a Q&A thread."
        : "Join to unlock feed posts, events, and community tools."
    }`,
  };
}

export function buildModerationSuggestions(sampleText?: string): CommunityModerationSuggestion[] {
  const text = (sampleText ?? "").toLowerCase();
  const suggestions: CommunityModerationSuggestion[] = [];

  if (/\b(buy now|crypto giveaway|whatsapp\.me\/\d+)\b/.test(text)) {
    suggestions.push({
      id: "spam",
      severity: "review",
      title: "Possible spam",
      detail: "Message patterns look promotional. Recommend a moderator review — do not auto-remove.",
      action: "recommend_review",
    });
  }

  if (/\b(same question|already asked|duplicate)\b/.test(text)) {
    suggestions.push({
      id: "duplicate",
      severity: "watch",
      title: "Possible duplicate question",
      detail: "Link the member to an existing Q&A thread instead of deleting.",
      action: "recommend_review",
    });
  }

  suggestions.push({
    id: "welcome",
    severity: "info",
    title: "Welcome new members",
    detail: "Pin a short welcome + rules post. AI can draft the message for you.",
    action: "recommend_welcome",
  });

  suggestions.push({
    id: "translate",
    severity: "info",
    title: "Offer translations",
    detail: "Suggest FR/SW/HA translations for announcements to widen reach.",
    action: "recommend_translate",
  });

  return suggestions;
}

export function buildCommunityInsights(args: {
  name: string;
  memberCount: number;
  category: string;
}): CommunityAssistantInsight[] {
  return [
    buildCommunitySummary(args),
    {
      id: "insight-activity",
      kind: "insight",
      title: "Community insights",
      body: `Engagement in ${args.category} spaces peaks evenings (6–8 PM). Schedule announcements then.`,
    },
    {
      id: "event",
      kind: "event",
      title: "Event recommendation",
      body: `Host a short Live Q&A this week for ${args.name} — voice rooms work well on low bandwidth.`,
    },
    {
      id: "stats",
      kind: "stats",
      title: "Community statistics",
      body: `${args.memberCount} members · Suggest weekly polls to lift participation without spam.`,
    },
  ];
}

export function translateCommunityAnnouncement(text: string, lang = "fr"): string {
  const trimmed = text.trim() || "Welcome to our community.";
  const prefix =
    lang === "sw" ? "[SW] " : lang === "ha" ? "[HA] " : lang === "pt" ? "[PT] " : "[FR] ";
  return `${prefix}${trimmed}\n\n(Suggested translation — review before posting.)`;
}
