export type NewsFeedItem = {
  title: string;
  link: string;
  publishedAt: string | null;
  source: string;
  platform: string;
};

export type LiveNewsCategoryId =
  | "politics"
  | "world"
  | "business"
  | "technology"
  | "sports"
  | "entertainment"
  | "health";

export type LiveNewsHeadline = NewsFeedItem & {
  category: LiveNewsCategoryId;
};

export type CategoryConfig = {
  id: LiveNewsCategoryId;
  label: string;
  feeds: Array<{ url: string; source: string }>;
};

export const LIVE_NEWS_CATEGORIES: CategoryConfig[] = [
  {
    id: "politics",
    label: "Politics",
    feeds: [
      { url: "https://feeds.bbci.co.uk/news/politics/rss.xml", source: "BBC Politics" },
      { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera" },
    ],
  },
  {
    id: "world",
    label: "World",
    feeds: [
      { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC World" },
      { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera" },
      { url: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en", source: "Google News" },
    ],
  },
  {
    id: "business",
    label: "Business",
    feeds: [
      { url: "https://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC Business" },
      {
        url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en",
        source: "Google Business",
      },
    ],
  },
  {
    id: "technology",
    label: "Technology",
    feeds: [
      { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", source: "BBC Technology" },
      {
        url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en",
        source: "Google Tech",
      },
    ],
  },
  {
    id: "sports",
    label: "Sports",
    feeds: [
      { url: "https://feeds.bbci.co.uk/sport/rss.xml", source: "BBC Sport" },
      { url: "https://feeds.bbci.co.uk/sport/football/rss.xml", source: "BBC Football" },
    ],
  },
  {
    id: "entertainment",
    label: "Entertainment",
    feeds: [
      {
        url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
        source: "BBC Entertainment",
      },
      {
        url: "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-US&gl=US&ceid=US:en",
        source: "Google Entertainment",
      },
    ],
  },
  {
    id: "health",
    label: "Health",
    feeds: [
      { url: "https://feeds.bbci.co.uk/news/health/rss.xml", source: "BBC Health" },
      {
        url: "https://news.google.com/rss/headlines/section/topic/HEALTH?hl=en-US&gl=US&ceid=US:en",
        source: "Google Health",
      },
    ],
  },
];

export function formatLiveNewsBriefing(
  rows: Array<{ category: string; items: LiveNewsHeadline[] }>
): string {
  const lines: string[] = [
    "Trusted headline briefing (cite these sources when answering current-events questions):",
  ];
  for (const row of rows) {
    if (row.items.length === 0) continue;
    lines.push(`\n[${row.category}]`);
    for (const item of row.items.slice(0, 4)) {
      lines.push(`- ${item.title} (${item.source}) ${item.link}`);
    }
  }
  return lines.join("\n").slice(0, 3500);
}
