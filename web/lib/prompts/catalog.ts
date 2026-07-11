export type PromptCategoryId =
  | "education"
  | "coding"
  | "business"
  | "marketing"
  | "writing"
  | "design"
  | "programming"
  | "productivity"
  | "research";

export type CuratedPrompt = {
  id: string;
  category: PromptCategoryId;
  title: string;
  description: string;
  body: string;
  tags: string[];
};

export const PROMPT_CATEGORIES: { id: PromptCategoryId; label: string }[] = [
  { id: "education", label: "Education" },
  { id: "coding", label: "Coding" },
  { id: "business", label: "Business" },
  { id: "marketing", label: "Marketing" },
  { id: "writing", label: "Writing" },
  { id: "design", label: "Design" },
  { id: "programming", label: "Programming" },
  { id: "productivity", label: "Productivity" },
  { id: "research", label: "Research" },
];

export const CURATED_PROMPTS: CuratedPrompt[] = [
  {
    id: "edu-lesson-plan",
    category: "education",
    title: "Lesson plan builder",
    description: "Outline objectives, activities, and assessment for any topic.",
    body: "Create a 45-minute lesson plan for [subject/topic] including learning objectives, warm-up, main activity, and a short quiz.",
    tags: ["teacher", "classroom"],
  },
  {
    id: "edu-explain",
    category: "education",
    title: "Explain like I'm 12",
    description: "Break down complex topics for younger learners.",
    body: "Explain [topic] in simple language suitable for a 12-year-old, with one real-world example.",
    tags: ["study", "simple"],
  },
  {
    id: "edu-quiz",
    category: "education",
    title: "Practice quiz generator",
    description: "Generate multiple-choice questions with answers.",
    body: "Create 10 multiple-choice questions about [topic] with answers and brief explanations.",
    tags: ["exam", "quiz"],
  },
  {
    id: "code-review",
    category: "programming",
    title: "Code review assistant",
    description: "Get constructive feedback on your code.",
    body: "Review this code for bugs, readability, and performance. Suggest improvements:\n\n```\n[paste code]\n```",
    tags: ["review", "quality"],
  },
  {
    id: "code-debug",
    category: "programming",
    title: "Debug error message",
    description: "Diagnose stack traces and fix errors.",
    body: "I'm getting this error. Explain the cause and show a fixed version:\n\nError: [paste error]\n\nCode:\n[paste code]",
    tags: ["debug", "fix"],
  },
  {
    id: "code-snippet",
    category: "coding",
    title: "Generate utility function",
    description: "Scaffold reusable code with comments.",
    body: "Write a well-commented [language] function that [describe task]. Include edge cases and a short usage example.",
    tags: ["snippet", "utility"],
  },
  {
    id: "biz-swot",
    category: "business",
    title: "SWOT analysis",
    description: "Strengths, weaknesses, opportunities, threats.",
    body: "Run a SWOT analysis for [business/idea] targeting [audience/market].",
    tags: ["strategy", "planning"],
  },
  {
    id: "biz-email",
    category: "business",
    title: "Professional client email",
    description: "Polished outreach or follow-up emails.",
    body: "Draft a professional email to [recipient] about [subject]. Tone: confident and friendly. Under 150 words.",
    tags: ["email", "clients"],
  },
  {
    id: "mkt-social",
    category: "marketing",
    title: "Social caption pack",
    description: "Hooks and CTAs for Instagram, X, and LinkedIn.",
    body: "Write 5 social media captions for [product/topic]. Include a hook, value line, and CTA. Mix tones: educational, bold, and friendly.",
    tags: ["social", "content"],
  },
  {
    id: "mkt-landing",
    category: "marketing",
    title: "Landing page copy",
    description: "Headline, subhead, and benefits section.",
    body: "Write landing page copy for [product]: headline, subheadline, 3 benefit bullets, and a CTA button label.",
    tags: ["copy", "conversion"],
  },
  {
    id: "write-blog",
    category: "writing",
    title: "Blog outline",
    description: "Structured outline with H2 sections.",
    body: "Create a detailed blog outline about [topic] for [audience]. Include intro hook, 5 H2 sections, and a conclusion CTA.",
    tags: ["blog", "outline"],
  },
  {
    id: "write-summary",
    category: "writing",
    title: "Executive summary",
    description: "Condense long text into key takeaways.",
    body: "Summarize the following into a 5-bullet executive summary:\n\n[paste text]",
    tags: ["summary", "brief"],
  },
  {
    id: "design-brief",
    category: "design",
    title: "Creative brief",
    description: "Mood, palette, and layout direction for visuals.",
    body: "Write a creative brief for [project] including mood, color palette suggestions, typography style, and 3 layout ideas.",
    tags: ["visual", "brand"],
  },
  {
    id: "design-image-prompt",
    category: "design",
    title: "Image generation prompt",
    description: "Detailed prompt for Media Studio.",
    body: "Write a detailed AI image prompt for [subject]. Include style, lighting, composition, and negative prompts.",
    tags: ["image", "media"],
  },
  {
    id: "prod-daily",
    category: "productivity",
    title: "Daily priority plan",
    description: "Top 3 tasks with time blocks.",
    body: "I have [hours] hours today. My goals: [list goals]. Create a realistic schedule with top 3 priorities and breaks.",
    tags: ["planning", "focus"],
  },
  {
    id: "prod-meeting",
    category: "productivity",
    title: "Meeting agenda",
    description: "Agenda, owners, and follow-ups.",
    body: "Create a 30-minute meeting agenda for [topic] with attendees [roles], decisions needed, and follow-up actions.",
    tags: ["meetings", "agenda"],
  },
  {
    id: "research-lit",
    category: "research",
    title: "Literature review outline",
    description: "Structure a research review by theme.",
    body: "Outline a literature review on [topic]. Group themes, note gaps, and suggest 5 search keywords.",
    tags: ["academic", "sources"],
  },
  {
    id: "research-compare",
    category: "research",
    title: "Compare options",
    description: "Pros/cons table for decisions.",
    body: "Compare [option A] vs [option B] for [use case]. Use a pros/cons table and a clear recommendation.",
    tags: ["analysis", "decision"],
  },
];

export function getPromptsByCategory(category: PromptCategoryId): CuratedPrompt[] {
  return CURATED_PROMPTS.filter((p) => p.category === category);
}

export function getPromptById(id: string): CuratedPrompt | undefined {
  return CURATED_PROMPTS.find((p) => p.id === id);
}

export function searchCuratedPrompts(query: string): CuratedPrompt[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return CURATED_PROMPTS.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.body.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q))
  );
}
