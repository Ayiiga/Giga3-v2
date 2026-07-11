import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Code2,
  GraduationCap,
  Briefcase,
  Trophy,
  Cpu,
  HeartPulse,
  Wallet,
  Clapperboard,
  Sparkles,
} from "lucide-react";

export type TrendCategoryId =
  | "ai"
  | "coding"
  | "education"
  | "business"
  | "sports"
  | "technology"
  | "health"
  | "finance"
  | "entertainment"
  | "creator-economy";

export type TrendCategory = {
  id: TrendCategoryId;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  keywords: string[];
};

/** Curated trending categories — swap data source later without UI changes. */
export const TREND_CATEGORIES: TrendCategory[] = [
  {
    id: "ai",
    label: "Artificial Intelligence",
    description: "LLMs, agents, automation, and AI tools",
    icon: Brain,
    href: "/trending?category=ai",
    keywords: ["ai", "gpt", "llm", "agents"],
  },
  {
    id: "coding",
    label: "Coding",
    description: "Programming help, debugging, and software craft",
    icon: Code2,
    href: "/trending?category=coding",
    keywords: ["code", "javascript", "python", "developer"],
  },
  {
    id: "education",
    label: "Education",
    description: "Study plans, exams, tutoring, and lesson prep",
    icon: GraduationCap,
    href: "/trending?category=education",
    keywords: ["study", "school", "homework", "exam"],
  },
  {
    id: "business",
    label: "Business",
    description: "Strategy, operations, and entrepreneurship",
    icon: Briefcase,
    href: "/trending?category=business",
    keywords: ["startup", "sales", "strategy", "management"],
  },
  {
    id: "sports",
    label: "Sports",
    description: "Scores, analysis, training, and fan content",
    icon: Trophy,
    href: "/trending?category=sports",
    keywords: ["football", "scores", "fitness", "training"],
  },
  {
    id: "technology",
    label: "Technology",
    description: "Gadgets, software trends, and digital life",
    icon: Cpu,
    href: "/trending?category=technology",
    keywords: ["tech", "software", "gadgets", "innovation"],
  },
  {
    id: "health",
    label: "Health",
    description: "Wellness, nutrition, and healthy habits",
    icon: HeartPulse,
    href: "/trending?category=health",
    keywords: ["wellness", "nutrition", "mental health"],
  },
  {
    id: "finance",
    label: "Finance",
    description: "Budgeting, investing, and money skills",
    icon: Wallet,
    href: "/trending?category=finance",
    keywords: ["money", "investing", "budget", "crypto"],
  },
  {
    id: "entertainment",
    label: "Entertainment",
    description: "Creators, culture, and viral moments",
    icon: Clapperboard,
    href: "/trending?category=entertainment",
    keywords: ["movies", "music", "viral", "creator"],
  },
  {
    id: "creator-economy",
    label: "Creator Economy",
    description: "Monetization, content, and audience growth",
    icon: Sparkles,
    href: "/trending?category=creator-economy",
    keywords: ["creator", "monetize", "content", "audience"],
  },
];

export function getTrendCategory(id: string): TrendCategory | undefined {
  return TREND_CATEGORIES.find((c) => c.id === id);
}
