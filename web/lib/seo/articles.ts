/** Public long-form articles — single list for the /blog index, footer and sitemap. */
export type PublicArticle = {
  href: string;
  title: string;
  description: string;
  audience: "Students" | "Creators" | "Businesses" | "Everyone";
  publishedAt: string;
};

export const PUBLIC_ARTICLES: readonly PublicArticle[] = [
  {
    href: "/ai-tools-for-students-ghana",
    title: "Best AI Tools for University Students in Ghana 2026",
    description:
      "Compare Giga3 AI, ChatGPT, Gemini, Copilot and Perplexity for study, research and coding — with GHS pricing and a responsible-use guide.",
    audience: "Students",
    publishedAt: "2026-09-02",
  },
  {
    href: "/ai-for-ghana",
    title: "AI for Students, Creators and Businesses in Ghana",
    description:
      "How Giga3 AI brings chat, research, coding, learning and creative tools together with Paystack billing in cedis.",
    audience: "Everyone",
    publishedAt: "2026-09-02",
  },
];
