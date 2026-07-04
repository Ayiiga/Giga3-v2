import { describe, expect, it } from "vitest";
import { parseFeedItems } from "../../convex/creatorNews";

const RSS_SAMPLE = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title><![CDATA[Headline One]]></title>
      <link>https://example.com/one</link>
      <pubDate>Thu, 03 Jul 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Headline Two &amp; More</title>
      <link>https://example.com/two</link>
      <pubDate>Wed, 02 Jul 2026 08:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const ATOM_SAMPLE = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Atom headline</title>
    <link href="https://example.com/atom" />
    <updated>2026-07-04T10:00:00Z</updated>
  </entry>
</feed>`;

describe("parseFeedItems", () => {
  it("parses RSS items with CDATA titles and entity decoding", () => {
    const items = parseFeedItems(RSS_SAMPLE, "Test Source", "News", 5);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: "Headline One",
      link: "https://example.com/one",
      source: "Test Source",
      platform: "News",
    });
    expect(items[1].title).toBe("Headline Two & More");
  });

  it("parses Atom entries with link href", () => {
    const items = parseFeedItems(ATOM_SAMPLE, "Atom Feed", "Social", 3);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "Atom headline",
      link: "https://example.com/atom",
      platform: "Social",
    });
  });

  it("respects the per-feed limit", () => {
    const items = parseFeedItems(RSS_SAMPLE, "Test", "News", 1);
    expect(items).toHaveLength(1);
  });
});
