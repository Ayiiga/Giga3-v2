export type SavedPrompt = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
};

const STORAGE_KEY = "giga3_saved_prompts";

const DEFAULT_PROMPTS: SavedPrompt[] = [
  {
    id: "draft-email",
    title: "Professional email",
    body: "Help me draft a professional email about: ",
    createdAt: 0,
  },
  {
    id: "summarize",
    title: "Summarize",
    body: "Summarize the key points in clear bullet points:\n\n",
    createdAt: 0,
  },
  {
    id: "explain-simple",
    title: "Explain simply",
    body: "Explain this concept in simple terms for a beginner:\n\n",
    createdAt: 0,
  },
];

function readAll(): SavedPrompt[] {
  if (typeof window === "undefined") return DEFAULT_PROMPTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROMPTS;
    const parsed = JSON.parse(raw) as SavedPrompt[];
    return parsed.length ? parsed : DEFAULT_PROMPTS;
  } catch {
    return DEFAULT_PROMPTS;
  }
}

export function listSavedPrompts(): SavedPrompt[] {
  return readAll();
}

export function savePrompt(title: string, body: string): SavedPrompt {
  const prompt: SavedPrompt = {
    id: `p_${Date.now()}`,
    title: title.trim().slice(0, 80),
    body: body.trim(),
    createdAt: Date.now(),
  };
  const next = [prompt, ...readAll().filter((p) => p.id !== prompt.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return prompt;
}
