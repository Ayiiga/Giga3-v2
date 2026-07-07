import type { AiModeId } from "@/lib/aiRouter";
import type { ChatCategoryId } from "@/lib/chat/chatCategories";
import { getCategoryForMode } from "@/lib/chat/chatCategories";

export interface SuggestedPrompt {
  text: string;
  label: string;
}

const CATEGORY_PROMPTS: Record<ChatCategoryId, SuggestedPrompt[]> = {
  education: [
    {
      label: "Explain simply",
      text: "Explain photosynthesis in simple terms with a Ghanaian farming example.",
    },
    {
      label: "Practice quiz",
      text: "Create a 5-question BECE-style quiz on fractions with answers.",
    },
    {
      label: "Homework help",
      text: "Help me solve this step by step: If 3x + 7 = 22, find x.",
    },
    {
      label: "Lesson plan",
      text: "Create a 40-minute lesson plan on the water cycle for JHS students.",
    },
  ],
  business: [
    {
      label: "Business plan",
      text: "Draft a one-page business plan outline for a mobile money agent in Accra.",
    },
    {
      label: "Professional email",
      text: "Help me write a professional email requesting a meeting with a client.",
    },
    {
      label: "Proposal",
      text: "Outline a proposal for a small catering business targeting office lunches.",
    },
    {
      label: "Interview prep",
      text: "Give me 5 common interview questions for a junior accountant role.",
    },
  ],
  writing: [
    {
      label: "Essay outline",
      text: "Create an essay outline on the impact of social media on youth in Ghana.",
    },
    {
      label: "Story idea",
      text: "Suggest a short story plot set in Kumasi with a surprise ending.",
    },
    {
      label: "Improve writing",
      text: "Rewrite this paragraph to sound more professional and concise.",
    },
    {
      label: "Blog post",
      text: "Write a 200-word blog intro about sustainable farming in West Africa.",
    },
  ],
  coding: [
    {
      label: "Debug code",
      text: "Help me debug this Python function that should return a sorted list.",
    },
    {
      label: "Explain concept",
      text: "Explain REST APIs simply with a real-world example.",
    },
    {
      label: "Build feature",
      text: "How do I add pagination to a React list component?",
    },
    {
      label: "Best practices",
      text: "What are best practices for securing a Node.js API?",
    },
  ],
  creativity: [
    {
      label: "Social post",
      text: "Write an engaging Instagram caption for a new African fashion brand.",
    },
    {
      label: "Content ideas",
      text: "Give me 10 content ideas for a tech education YouTube channel.",
    },
    {
      label: "Creative hook",
      text: "Write 3 catchy hooks for a podcast about African innovation.",
    },
    {
      label: "Brainstorm",
      text: "Brainstorm names for a community learning app for Ghanaian students.",
    },
  ],
  general: [
    {
      label: "Summarize",
      text: "Summarize the key points of climate change impacts in Africa.",
    },
    {
      label: "Compare",
      text: "Compare mobile money services in Ghana — pros and cons.",
    },
    {
      label: "Plan trip",
      text: "Suggest a 3-day itinerary for visiting Cape Coast and Elmina.",
    },
    {
      label: "Explain",
      text: "Explain how Ghana's democratic system works in simple terms.",
    },
  ],
};

/** Mode-specific prompts for workspace tools not covered by categories. */
const MODE_OVERRIDES: Partial<Record<AiModeId, SuggestedPrompt[]>> = {
  waec: [
    {
      label: "WAEC practice",
      text: "Give me a WASSCE-style question on chemical bonding with a worked solution.",
    },
    {
      label: "Past paper style",
      text: "Create a WAEC past-paper style question on quadratic equations.",
    },
    {
      label: "Marking guide",
      text: "Show the marking scheme for a 10-mark essay on democracy.",
    },
  ],
  homework: CATEGORY_PROMPTS.education,
  university: [
    {
      label: "Concept review",
      text: "Explain supply and demand with a Ghanaian market example.",
    },
    {
      label: "Essay structure",
      text: "Help me structure a 2000-word essay on renewable energy policy.",
    },
    {
      label: "Study plan",
      text: "Create a 2-week study plan for my economics finals.",
    },
  ],
  news: [
    {
      label: "Headlines",
      text: "Summarize today's top news stories in Ghana and West Africa.",
    },
    {
      label: "Fact check",
      text: "Help me verify whether this claim is likely true or misinformation.",
    },
  ],
};

export function getSuggestedPrompts(mode: AiModeId, limit = 4): SuggestedPrompt[] {
  const override = MODE_OVERRIDES[mode];
  if (override) return override.slice(0, limit);

  const category = getCategoryForMode(mode);
  return (CATEGORY_PROMPTS[category.id] ?? CATEGORY_PROMPTS.general).slice(0, limit);
}
