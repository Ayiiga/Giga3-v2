import { describe, expect, it } from "vitest";
import {
  parseEspnScoreboard,
  parseSportsNewsFeed,
} from "../../convex/sportsScores";

const ESPN_FIXTURE = {
  events: [
    {
      id: "760499",
      date: "2026-07-03T18:00Z",
      name: "Egypt at Australia",
      season: { slug: "round-of-32", year: 2026 },
      competitions: [
        {
          date: "2026-07-03T18:00Z",
          altGameNote: "FIFA World Cup, Round of 32",
          status: {
            type: {
              state: "post",
              shortDetail: "FT-Pens",
              detail: "Final Score - After Penalties",
            },
          },
          venue: { fullName: "AT&T Stadium" },
          competitors: [
            {
              homeAway: "home",
              score: "1",
              team: { displayName: "Australia" },
            },
            {
              homeAway: "away",
              score: "1",
              team: { displayName: "Egypt" },
            },
          ],
        },
      ],
      links: [{ rel: ["summary"], href: "https://example.com/match" }],
    },
    {
      id: "999",
      date: "2026-07-04T20:00Z",
      name: "Team A at Team B",
      competitions: [
        {
          date: "2026-07-04T20:00Z",
          status: {
            type: { state: "in", shortDetail: "65'" },
          },
          competitors: [
            { homeAway: "home", score: "2", team: { displayName: "Team A" } },
            { homeAway: "away", score: "1", team: { displayName: "Team B" } },
          ],
        },
      ],
    },
  ],
};

describe("parseEspnScoreboard", () => {
  it("maps finished and live matches with scores", () => {
    const matches = parseEspnScoreboard(ESPN_FIXTURE, "Football");
    expect(matches).toHaveLength(2);
    expect(matches[0]).toMatchObject({
      sport: "Football",
      league: "FIFA World Cup, Round of 32",
      homeTeam: "Australia",
      awayTeam: "Egypt",
      homeScore: "1",
      awayScore: "1",
      status: "finished",
      statusLabel: "FT-Pens",
      venue: "AT&T Stadium",
    });
    expect(matches[1]).toMatchObject({
      status: "live",
      statusLabel: "65'",
      homeScore: "2",
      awayScore: "1",
    });
  });
});

describe("parseSportsNewsFeed", () => {
  it("parses RSS sports headlines", () => {
    const xml = `<?xml version="1.0"?>
    <rss><channel>
      <item>
        <title><![CDATA[Black Stars win friendly]]></title>
        <link>https://example.com/story</link>
        <pubDate>Sat, 04 Jul 2026 10:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;
    const items = parseSportsNewsFeed(xml, "BBC Sport", 3);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Black Stars win friendly");
  });
});
