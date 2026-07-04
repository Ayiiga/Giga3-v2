"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireSessionWithMonitoring } from "./auth";

export type SportsMatchStatus = "live" | "scheduled" | "finished";

export type SportsMatch = {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string | null;
  awayScore: string | null;
  status: SportsMatchStatus;
  statusLabel: string;
  startTime: string;
  venue?: string;
  link?: string;
};

export type SportsUpdateItem = {
  title: string;
  link: string;
  publishedAt: string | null;
  source: string;
};

const ESPN_SCOREBOARDS: Array<{ sport: string; league: string; path: string }> = [
  { sport: "Football", league: "All soccer", path: "/sports/soccer/all/scoreboard" },
  { sport: "Football", league: "Premier League", path: "/sports/soccer/eng.1/scoreboard" },
  { sport: "Football", league: "La Liga", path: "/sports/soccer/esp.1/scoreboard" },
  { sport: "Football", league: "Champions League", path: "/sports/soccer/uefa.champions/scoreboard" },
  { sport: "Football", league: "World Cup", path: "/sports/soccer/fifa.world/scoreboard" },
  { sport: "Basketball", league: "NBA", path: "/sports/basketball/nba/scoreboard" },
  { sport: "American Football", league: "NFL", path: "/sports/football/nfl/scoreboard" },
  { sport: "Baseball", league: "MLB", path: "/sports/baseball/mlb/scoreboard" },
  { sport: "Hockey", league: "NHL", path: "/sports/hockey/nhl/scoreboard" },
];

const SPORT_NEWS_FEEDS: Array<{ url: string; source: string }> = [
  {
    url: "https://feeds.bbci.co.uk/sport/football/rss.xml",
    source: "BBC Sport Football",
  },
  {
    url: "https://feeds.bbci.co.uk/sport/rss.xml",
    source: "BBC Sport",
  },
];

type EspnCompetitor = {
  homeAway?: string;
  score?: string;
  team?: { displayName?: string };
};

type EspnCompetition = {
  date?: string;
  status?: {
    type?: {
      state?: string;
      shortDetail?: string;
      detail?: string;
    };
  };
  competitors?: EspnCompetitor[];
  venue?: { fullName?: string };
  notes?: Array<{ headline?: string }>;
  altGameNote?: string;
};

type EspnEvent = {
  id?: string;
  date?: string;
  name?: string;
  season?: { slug?: string; year?: number };
  competitions?: EspnCompetition[];
  links?: Array<{ href?: string; rel?: string[] }>;
};

function mapEspnState(state?: string): SportsMatchStatus {
  if (state === "in") return "live";
  if (state === "pre") return "scheduled";
  return "finished";
}

function statusRank(status: SportsMatchStatus): number {
  if (status === "live") return 0;
  if (status === "scheduled") return 1;
  return 2;
}

export function parseEspnScoreboard(
  json: { events?: EspnEvent[] },
  sport: string
): SportsMatch[] {
  const matches: SportsMatch[] = [];

  for (const event of json.events ?? []) {
    const competition = event.competitions?.[0];
    if (!competition) continue;

    const home = competition.competitors?.find((c) => c.homeAway === "home");
    const away = competition.competitors?.find((c) => c.homeAway === "away");
    if (!home?.team?.displayName || !away?.team?.displayName) continue;

    const state = competition.status?.type?.state;
    const status = mapEspnState(state);
    const statusLabel =
      competition.status?.type?.shortDetail ??
      competition.status?.type?.detail ??
      (status === "scheduled" ? "Scheduled" : "Final");

    const league =
      competition.altGameNote ??
      competition.notes?.[0]?.headline ??
      event.season?.slug?.replace(/-/g, " ") ??
      sport;

    const link = event.links?.find((l) => l.rel?.includes("summary"))?.href;

    matches.push({
      id: `${sport}-${event.id ?? event.name}`,
      sport,
      league,
      homeTeam: home.team.displayName,
      awayTeam: away.team.displayName,
      homeScore: home.score ?? null,
      awayScore: away.score ?? null,
      status,
      statusLabel,
      startTime: competition.date ?? event.date ?? "",
      venue: competition.venue?.fullName,
      link,
    });
  }

  return matches;
}

function decodeEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function parseSportsNewsFeed(
  xml: string,
  source: string,
  limit = 4
): SportsUpdateItem[] {
  const items: SportsUpdateItem[] = [];
  const blocks = xml.match(/<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi) ?? [];

  for (const block of blocks) {
    if (items.length >= limit) break;
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch =
      block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ??
      block.match(/<link[^>]+href=["']([^"']+)["']/i);
    const dateMatch =
      block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) ??
      block.match(/<updated>([\s\S]*?)<\/updated>/i);

    const title = titleMatch ? decodeEntities(titleMatch[1]) : "";
    const link = linkMatch ? decodeEntities(linkMatch[1]).trim() : "";
    if (!title || !link) continue;

    items.push({
      title: title.slice(0, 300),
      link,
      publishedAt: dateMatch ? decodeEntities(dateMatch[1]) : null,
      source,
    });
  }

  return items;
}

async function fetchEspnBoard(
  board: (typeof ESPN_SCOREBOARDS)[number]
): Promise<SportsMatch[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2${board.path}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Giga3SportsDesk/1.0 (+https://www.giga3ai.com)",
        Accept: "application/json",
      },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { events?: EspnEvent[] };
    const matches = parseEspnScoreboard(json, board.sport);
    return matches.map((match) => ({
      ...match,
      league: match.league === board.sport ? board.league : `${board.league} · ${match.league}`,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSportsFeed(
  feed: (typeof SPORT_NEWS_FEEDS)[number],
  limit: number
): Promise<SportsUpdateItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Giga3SportsDesk/1.0 (+https://www.giga3ai.com)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseSportsNewsFeed(xml, feed.source, limit);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Live scores and fixtures from major leagues (ESPN) plus sports headlines. */
export const fetchLiveSports = action({
  args: {
    sessionToken: v.string(),
    sportFilter: v.optional(v.string()),
    updatesPerFeed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSessionWithMonitoring(args.sessionToken, ctx, "sportsScores.fetch");
    const perFeed = Math.min(Math.max(args.updatesPerFeed ?? 3, 1), 5);
    const filter = args.sportFilter?.trim().toLowerCase();

    const boards = filter
      ? ESPN_SCOREBOARDS.filter(
          (b) =>
            b.sport.toLowerCase().includes(filter) ||
            b.league.toLowerCase().includes(filter)
        )
      : ESPN_SCOREBOARDS;

    const [matchBatches, updateBatches] = await Promise.all([
      Promise.all(boards.map((board) => fetchEspnBoard(board))),
      Promise.all(SPORT_NEWS_FEEDS.map((feed) => fetchSportsFeed(feed, perFeed))),
    ]);

    const matches = matchBatches
      .flat()
      .sort((a, b) => {
        const rank = statusRank(a.status) - statusRank(b.status);
        if (rank !== 0) return rank;
        return Date.parse(b.startTime) - Date.parse(a.startTime);
      })
      .slice(0, 48);

    const seen = new Set<string>();
    const updates: SportsUpdateItem[] = [];
    for (const item of updateBatches.flat()) {
      const key = item.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      updates.push(item);
    }

    return {
      fetchedAt: Date.now(),
      liveCount: matches.filter((m) => m.status === "live").length,
      matches,
      updates: updates.slice(0, 12),
      sources: ["ESPN Scoreboard", ...SPORT_NEWS_FEEDS.map((f) => f.source)],
    };
  },
});

/** Daily digest push for live matches (cron; feature-flagged). */
export const notifyLiveSportsDigest = internalAction({
  args: {},
  handler: async (ctx) => {
    const boards = ESPN_SCOREBOARDS.slice(0, 4);
    const batches = await Promise.all(boards.map((board) => fetchEspnBoard(board)));
    const live = batches.flat().filter((m) => m.status === "live");
    if (live.length === 0) return { sent: 0 };

    const sample = live[0];
    return await ctx.runAction(internal.pushAlerts.notifySportsLive, {
      title: `${live.length} live match${live.length === 1 ? "" : "es"} now`,
      body: `${sample.homeTeam} ${sample.homeScore ?? "-"} – ${sample.awayScore ?? "-"} ${sample.awayTeam} · ${sample.league}`,
    });
  },
});
