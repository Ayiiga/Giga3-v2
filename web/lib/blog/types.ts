/** Strongly typed blog post model for the Giga3 AI /blog system. */
export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  category: string;
  tags: string[];
  author: string;
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
