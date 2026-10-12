/** Strongly typed blog post model for the Giga3 AI /blog system. */
export type BlogPost = {
  slug: string;
  title: string;
  /** Optional shorter string for the HTML `<title>` / Open Graph title (visible H1 uses `title`). */
  seoTitle?: string;
  description: string;
  excerpt: string;
  category: string;
  tags: string[];
  author: string;
  /**
   * JSON-LD `@type` for `author`. Defaults to Organization (editorial team).
   * Set to Person for named individual bylines.
   */
  authorType?: "Person" | "Organization";
  publishedAt: string;
  updatedAt?: string;
  featuredImage: string;
  featuredImageAlt: string;
  readingTime?: string;
  keywords?: string[];
};

export type BlogPostWithPath = BlogPost & {
  href: `/blog/${string}/`;
};
