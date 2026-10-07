/**
 * SEO content plan — editorial roadmap only (no auto-publishing).
 * Prefer upgrading existing articles over creating duplicates.
 */
export type SeoContentPlanEntry = {
  title: string;
  targetKeyword: string;
  searchIntent: string;
  recommendedPath: string;
  internalLinks: readonly string[];
  upgradeInsteadOfDuplicate?: readonly string[];
};

/** Flagship article roadmap aligned with Ghana/Africa positioning. */
export const SEO_CONTENT_PLAN: readonly SeoContentPlanEntry[] = [
  {
    title: "AI in Ghana: Opportunities, Tools and Responsible Use",
    targetKeyword: "ai in ghana",
    searchIntent: "Informational — national AI landscape and practical next steps",
    recommendedPath: "/blog/ghana-ai-future-opportunities-challenges/",
    internalLinks: ["/ai-for-ghana/", "/features/", "/pricing/"],
    upgradeInsteadOfDuplicate: ["/blog/ghana-ai-future-opportunities-challenges/"],
  },
  {
    title: "Best AI Tools in Ghana (2026): Free and Affordable Options",
    targetKeyword: "best ai tools in ghana",
    searchIntent: "Comparison — primary pillar for tool discovery",
    recommendedPath: "/blog/best-ai-tools-in-ghana-2026/",
    internalLinks: ["/ai-for-ghana/", "/features/", "/blog/top-ai-apps-in-ghana-2026/"],
    upgradeInsteadOfDuplicate: ["/blog/best-ai-tools-in-ghana-2026/"],
  },
  {
    title: "Best AI Tools for Ghanaian Students",
    targetKeyword: "ai tools for ghanaian students",
    searchIntent: "Comparison — student-specific workflows and academic integrity",
    recommendedPath: "/ai-tools-for-students-ghana/",
    internalLinks: ["/gigalearn/", "/ai-for-bece-wassce-ghana/", "/blog/ai-tools-for-ghanaian-students-2026/"],
    upgradeInsteadOfDuplicate: [
      "/ai-tools-for-students-ghana/",
      "/blog/ai-tools-for-ghanaian-students-2026/",
    ],
  },
  {
    title: "BECE AI Study Guide for Ghanaian Students",
    targetKeyword: "bece ai preparation ghana",
    searchIntent: "Informational — JHS exam revision with responsible AI",
    recommendedPath: "/blog/ai-for-bece-wassce-preparation-ghana/",
    internalLinks: ["/gigalearn/", "/ai-for-bece-wassce-ghana/", "/ai-for-teachers-ghana/"],
    upgradeInsteadOfDuplicate: ["/blog/ai-for-bece-wassce-preparation-ghana/"],
  },
  {
    title: "WASSCE AI Study Guide for Ghanaian Students",
    targetKeyword: "wassce ai study guide",
    searchIntent: "Informational — SHS exam revision with responsible AI",
    recommendedPath: "/blog/wassce-ai-study-guide/",
    internalLinks: ["/gigalearn/", "/ai-for-bece-wassce-ghana/", "/blog/wassce-2026-results-ghana/"],
    upgradeInsteadOfDuplicate: ["/blog/wassce-ai-study-guide/"],
  },
  {
    title: "AI for Ghanaian Teachers: Save Time on Lesson Planning",
    targetKeyword: "ai for ghanaian teachers",
    searchIntent: "Informational — classroom productivity workflows",
    recommendedPath: "/blog/ai-for-ghanaian-teachers/",
    internalLinks: ["/ai-for-teachers-ghana/", "/ai-for-schools-ghana/", "/gigalearn/"],
    upgradeInsteadOfDuplicate: ["/blog/ai-for-ghanaian-teachers/", "/ai-for-teachers-ghana/"],
  },
  {
    title: "AI for African Creators: Create, Edit and Publish",
    targetKeyword: "ai for creators africa",
    searchIntent: "Commercial investigation — creator toolchain",
    recommendedPath: "/ai-for-creators-ghana/",
    internalLinks: ["/media/", "/gigaedit/", "/gigasocial/", "/blog/ai-money-making-opportunities-ghana/"],
    upgradeInsteadOfDuplicate: ["/ai-for-creators-ghana/"],
  },
  {
    title: "AI for Ghanaian Businesses: Productivity and Automation",
    targetKeyword: "ai for business ghana",
    searchIntent: "Commercial investigation — SME and team workflows",
    recommendedPath: "/ai-for-business-ghana/",
    internalLinks: ["/enterprise/", "/automation/", "/pricing/"],
    upgradeInsteadOfDuplicate: ["/ai-for-business-ghana/"],
  },
  {
    title: "The Future of AI in Africa: Skills, Jobs and Education",
    targetKeyword: "future of ai in africa",
    searchIntent: "Informational — youth skills and workforce change",
    recommendedPath: "/blog/african-youth-ai-future-jobs/",
    internalLinks: ["/african-ai-tools/", "/gigalearn/", "/blog/one-million-coders-ghana-tech-future/"],
    upgradeInsteadOfDuplicate: ["/blog/african-youth-ai-future-jobs/"],
  },
  {
    title: "The Story of Giga3 AI: Built in Ghana for Everyone",
    targetKeyword: "giga3 ai",
    searchIntent: "Brand / navigational — founder and mission narrative",
    recommendedPath: "/about/",
    internalLinks: ["/press/", "/features/", "/ai-for-ghana/"],
    upgradeInsteadOfDuplicate: ["/about/"],
  },
];
