/** Internal links between Giga3 AI products — used for SEO intros and footer navigation. */
export const GIGA3_PRODUCT_LINKS = [
  { href: "/chat", label: "AI Assistant" },
  { href: "/gigalearn/academy/", label: "GigaLearn Academy" },
  { href: "/gigalearn/exam/", label: "Exam Practice" },
  { href: "/gigalearn/academy/tech/", label: "Technology Hub" },
  { href: "/gigalearn", label: "GigaLearn" },
  { href: "/gigasocial", label: "GigaSocial" },
  { href: "/ai-for-bece-wassce-ghana", label: "BECE & WASSCE prep" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/creator-studio", label: "Creator Studio" },
  { href: "/documents", label: "Document Studio" },
  { href: "/enterprise", label: "Enterprise" },
  { href: "/discover", label: "Discover" },
  { href: "/pricing", label: "Pricing" },
] as const;

/** Footer product column — crawlable internal links across the public ecosystem. */
export const FOOTER_PRODUCT_LINKS = [
  { href: "/", label: "Giga3 AI" },
  { href: "/features", label: "All features" },
  { href: "/chat", label: "AI Assistant" },
  { href: "/gigalearn/academy/", label: "GigaLearn Academy" },
  { href: "/gigalearn/exam/", label: "Exam Practice" },
  { href: "/gigalearn/academy/tech/", label: "Technology Hub" },
  { href: "/gigasocial", label: "GigaSocial" },
  { href: "/gigalearn", label: "GigaLearn" },
  { href: "/creator-studio", label: "Creator Studio" },
  { href: "/documents", label: "Document Studio" },
  { href: "/discover", label: "Discover" },
  { href: "/trending", label: "Trending topics" },
  { href: "/prompts", label: "Prompt library" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/enterprise", label: "Enterprise & Education" },
  { href: "/developers", label: "Developer API" },
  { href: "/pricing", label: "Pricing" },
  { href: "/ai-for-ghana", label: "AI for Ghana" },
  { href: "/african-ai-tools", label: "African AI tools" },
  { href: "/ai-tools-for-students-ghana", label: "AI tools for students" },
  { href: "/ai-for-teachers-ghana", label: "AI for teachers" },
  { href: "/ai-for-schools-ghana", label: "AI for schools" },
  { href: "/ai-for-bece-wassce-ghana", label: "BECE & WASSCE prep" },
  { href: "/ai-for-business-ghana", label: "AI for business" },
  { href: "/ai-for-creators-ghana", label: "AI for creators" },
  { href: "/install", label: "Install app" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/press", label: "Press" },
  { href: "/contact", label: "Contact" },
] as const;

/** Education-first creator path — writing → social (Media Studio / GigaEdits retired). */
export const CREATOR_WORKFLOW_STEPS = [
  {
    step: "Write",
    href: "/creator-studio",
    description: "Draft captions and scripts in Creator Studio.",
  },
  {
    step: "Ask",
    href: "/chat",
    description: "Use the AI Assistant for research, writing help, and in-chat images.",
  },
  {
    step: "Publish",
    href: "/gigasocial/?compose=text",
    description: "Share finished work to GigaSocial and your audience.",
  },
] as const;
