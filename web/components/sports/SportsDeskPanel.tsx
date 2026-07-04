"use client";

import { Button } from "@/components/ui/Button";
import { formatTimestampDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { ExternalLink, RefreshCw, Trophy } from "lucide-react";
import { useCallback, useState } from "react";

type SportsMatch = {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string | null;
  awayScore: string | null;
  status: "live" | "scheduled" | "finished";
  statusLabel: string;
  startTime: string;
  venue?: string;
  link?: string;
};

type SportsUpdate = {
  title: string;
  link: string;
  publishedAt: string | null;
  source: string;
};

const STATUS_CLASS: Record<SportsMatch["status"], string> = {
  live: "text-red-700 bg-red-500/10",
  scheduled: "text-blue-700 bg-blue-500/10",
  finished: "text-muted bg-accent/10",
};

const STATUS_LABEL: Record<SportsMatch["status"], string> = {
  live: "Live",
  scheduled: "Upcoming",
  finished: "Final",
};

export function SportsDeskPanel({
  sessionToken,
  variant = "chat",
}: {
  sessionToken: string;
  variant?: "chat" | "marketplace";
}) {
  const fetchLiveSports = useAction(api.sportsScores.fetchLiveSports);
  const embedded = variant === "chat";

  const [matches, setMatches] = useState<SportsMatch[]>([]);
  const [updates, setUpdates] = useState<SportsUpdate[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [sportFilter, setSportFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadScores = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await fetchLiveSports({
        sessionToken,
        sportFilter: sportFilter || undefined,
        updatesPerFeed: 3,
      });
      setMatches(result.matches as SportsMatch[]);
      setUpdates(result.updates as SportsUpdate[]);
      setLiveCount(result.liveCount);
      setFetchedAt(result.fetchedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load sports scores.");
    } finally {
      setLoading(false);
    }
  }, [fetchLiveSports, sessionToken, sportFilter]);

  return (
    <section className={cn(embedded ? "px-3 py-4 sm:px-4" : "rounded-2xl border bg-card p-6")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-800">
            <Trophy className="h-4 w-4" aria-hidden />
            Giga3 sports desk
          </div>
          <h2 className={cn("font-semibold", embedded ? "text-base" : "text-lg")}>
            Live scores &amp; sports updates
          </h2>
          <p className="mt-2 text-sm text-muted">
            Real-time scores from football, basketball, NFL, and MLB — plus the latest sports
            headlines.
          </p>
          {fetchedAt && (
            <p className="mt-1 text-xs text-muted">
              Updated {formatTimestampDateTime(fetchedAt)}
              {liveCount > 0 ? ` · ${liveCount} live now` : ""}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void loadScores()}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          {loading ? "Loading…" : "Refresh scores"}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {["", "Football", "Basketball", "American Football", "Baseball"].map((sport) => (
          <button
            key={sport || "all"}
            type="button"
            onClick={() => setSportFilter(sport)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              sportFilter === sport
                ? "bg-accent text-white"
                : "bg-accent/10 text-accent hover:bg-accent/20"
            )}
          >
            {sport || "All sports"}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {matches.length > 0 && (
        <ul className="mt-4 space-y-3">
          {matches.map((match) => (
            <li
              key={match.id}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="rounded-full bg-accent/10 px-2 py-0.5 font-medium text-accent">
                  {match.sport}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-semibold",
                    STATUS_CLASS[match.status]
                  )}
                >
                  {match.status === "live" ? match.statusLabel : STATUS_LABEL[match.status]}
                  {match.status === "live" ? "" : ` · ${match.statusLabel}`}
                </span>
                <span className="line-clamp-1">{match.league}</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <p className="text-sm font-semibold text-foreground sm:text-right">
                  {match.homeTeam}
                </p>
                <p className="text-center text-lg font-bold tabular-nums text-foreground">
                  {match.homeScore != null && match.awayScore != null
                    ? `${match.homeScore} – ${match.awayScore}`
                    : "vs"}
                </p>
                <p className="text-sm font-semibold text-foreground">{match.awayTeam}</p>
              </div>
              {match.venue && (
                <p className="mt-2 text-xs text-muted">{match.venue}</p>
              )}
              {match.link && (
                <a
                  href={match.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  Match details
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {updates.length > 0 && (
        <div className="mt-6 border-t border-border pt-6">
          <h3 className="text-base font-semibold">Sports headlines</h3>
          <ul className="mt-3 space-y-2">
            {updates.map((item) => (
              <li key={`${item.source}-${item.link}`} className="text-sm">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-accent hover:underline"
                >
                  {item.title}
                </a>
                <span className="mt-0.5 block text-xs text-muted">
                  {item.source}
                  {item.publishedAt ? ` · ${item.publishedAt}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && matches.length === 0 && !error && (
        <p className="mt-4 text-sm text-muted">
          Tap <strong>Refresh scores</strong> to load live and recent results.
        </p>
      )}
    </section>
  );
}
