import type { GigaLearnQuestion } from "@/lib/gigalearn/questions";

export type WeakTopicHint = {
  topicKey: string;
  subject?: string;
  label: string;
  lastScore?: number | null;
};

export function positiveWeakTopicLabel(raw: string): string {
  const cleaned = raw.replace(/\//g, " · ").trim();
  if (!cleaned) return "this topic";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function weakTopicPracticeHeadline(hint: WeakTopicHint): string {
  const label = positiveWeakTopicLabel(hint.label || hint.topicKey);
  return `Let's strengthen ${label}`;
}

export function weakTopicPracticeSubline(hint: WeakTopicHint): string {
  const score = hint.lastScore;
  if (score != null && score < 70) {
    return `Practice what you need most — last score ${score}%. A short focused set can help.`;
  }
  return "Practice what you need most — a short focused set can help.";
}

function matchesWeakTopic(question: GigaLearnQuestion, hint: WeakTopicHint): boolean {
  const haystack = [
    question.topic,
    question.subtopic,
    question.learningObjective,
    question.stem,
    hint.label,
    hint.topicKey,
    hint.subject,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const needles = [
    hint.label,
    hint.topicKey.replace(/\//g, " "),
    hint.subject?.replace(/-/g, " "),
  ]
    .filter(Boolean)
    .flatMap((n) => n!.toLowerCase().split(/\s+/))
    .filter((w) => w.length > 3);

  return needles.some((word) => haystack.includes(word));
}

export function selectQuestionsForWeakTopics(
  questions: GigaLearnQuestion[],
  hints: WeakTopicHint[],
  limit = 5
): GigaLearnQuestion[] {
  if (!hints.length) return [];
  const picked: GigaLearnQuestion[] = [];
  const seen = new Set<string>();

  for (const hint of hints) {
    for (const q of questions) {
      if (seen.has(q.id)) continue;
      if (matchesWeakTopic(q, hint)) {
        picked.push(q);
        seen.add(q.id);
        if (picked.length >= limit) return picked;
      }
    }
  }

  return picked;
}

export function revisionQuestionIds(
  results: Record<string, boolean>
): string[] {
  return Object.entries(results)
    .filter(([, correct]) => !correct)
    .map(([id]) => id);
}
